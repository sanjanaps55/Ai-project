import { createClient } from "@/utils/supabase/server";
import { THERAPIST_SYSTEM_PROMPT, buildConversationTitle } from "@/utils/therapist-prompt";
import {
    fetchConversationSummaryForContext,
    linkConversationToMessage,
    updateSummaryAndMemory,
} from "@/app/api/chat/summary-memory";
import { readGeminiTextStream } from "@/utils/gemini-stream";
import { NextRequest } from "next/server";
import {
    getEmbedding,
    ingestUserMessageIntoRagBuffer,
    flushRagBufferTailAfterTurn,
} from "@/app/api/chat/rag-buffer";

const GEMINI_STREAM_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";
const MESSAGE_CONTEXT_LIMIT = 30;

interface MessageRecord {
    id: string;
    conversation_id: string;
    transcript: { role: string; content: string }[] | null;
}

/** NDJSON lines: meta, t (delta), done | error */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, conversationId } = await request.json();

        if (!message || typeof message !== "string") {
            return Response.json({ error: "Message is required" }, { status: 400 });
        }

        let convId = conversationId as string | null;
        let isNewConversation = false;

        if (!convId) {
            const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                    user_id: user.id,
                    title: buildConversationTitle(message),
                })
                .select("id")
                .single();

            if (convError || !newConv) {
                return Response.json(
                    { error: "Failed to create conversation in database" },
                    { status: 500 }
                );
            }
            convId = newConv.id;
            isNewConversation = true;
        } else {
            const { data: existingConv, error: checkError } = await supabase
                .from("conversations")
                .select("id")
                .eq("id", convId)
                .single();

            if (checkError || !existingConv) {
                return Response.json(
                    { error: "Conversation not found. It may have been deleted." },
                    { status: 404 }
                );
            }
        }

        // Fetch message row using conversations.message_id as source of truth.
        const { data: convRow, error: convLookupError } = await supabase
            .from("conversations")
            .select("message_id")
            .eq("id", convId)
            .maybeSingle();
        if (convLookupError) {
            console.error("Conversation message_id lookup error:", convLookupError);
        }

        let existingRow: MessageRecord | null = null;

        if (convRow?.message_id) {
            const { data: byId, error: byIdError } = await supabase
                .from("messages")
                .select("id, conversation_id, transcript")
                .eq("id", convRow.message_id)
                .maybeSingle();
            if (byIdError) {
                console.error("Select transcript by message_id error:", byIdError);
            }
            existingRow = (byId as MessageRecord) ?? null;
        } else {
            // Fallback for old data before message_id backfill.
            const { data: byConversation, error: byConversationError } = await supabase
                .from("messages")
                .select("id, conversation_id, transcript")
                .eq("conversation_id", convId)
                .limit(1)
                .maybeSingle();
            if (byConversationError) {
                console.error("Select transcript by conversation_id error:", byConversationError);
            }
            existingRow = (byConversation as MessageRecord) ?? null;
            if (existingRow?.id) {
                await linkConversationToMessage(supabase, convId as string, existingRow.id);
            }
        }

        let transcript: { role: string; content: string }[] = [];
        if (existingRow && Array.isArray(existingRow.transcript)) {
            transcript = existingRow.transcript;
        }

        let isExistingRow = !!existingRow;
        let messagesRowId: string | null = existingRow ? existingRow.id : null;

        const saveTranscript = async (t: { role: string; content: string }[]) => {
            if (isExistingRow && messagesRowId) {
                const { error } = await supabase.from("messages").update({ transcript: t }).eq("id", messagesRowId);
                if (error) console.error("Update transcript error:", error);
            } else if (isExistingRow) {
                const { error } = await supabase
                    .from("messages")
                    .update({ transcript: t })
                    .eq("conversation_id", convId);
                if (error) console.error("Update transcript error:", error);
            } else {
                const { data: inserted, error } = await supabase
                    .from("messages")
                    .insert({ conversation_id: convId, transcript: t })
                    .select("id")
                    .single();
                if (error) console.error("Insert transcript error:", error);
                else if (inserted?.id) {
                    messagesRowId = inserted.id as string;
                    isExistingRow = true;
                    await linkConversationToMessage(supabase, convId as string, messagesRowId);
                }
            }
        };

        transcript.push({ role: "user", content: message });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
        }

        let retrievedContext = "";
        try {
            const queryEmbedding = await getEmbedding(message, apiKey, "RETRIEVAL_QUERY");
            if (queryEmbedding) {
                const { data: matches, error: matchError } = await supabase.rpc("match_messages", {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.35,
                    match_count: 8,
                    p_user_id: user.id,
                });

                if (matchError) {
                    console.error("RAG match_messages RPC error:", matchError.message, matchError);
                } else if (matches && matches.length > 0) {
                    retrievedContext = matches.map((m: { content: string }) => m.content).join("\n\n---\n\n");
                    console.log(
                        "\n🧠 RAG RETRIEVAL:",
                        matches.length,
                        "chunks injected into prompt context\n",
                        retrievedContext.slice(0, 800),
                        retrievedContext.length > 800 ? "…" : "",
                        "\n"
                    );
                } else {
                    console.log("🧠 RAG: no rows above threshold (embeddings empty or low similarity)");
                }
            }
        } catch (e) {
            console.error("RAG Retrieval error:", e);
        }

        const [conversationSummary, memResult] = await Promise.all([
            fetchConversationSummaryForContext(supabase, convId as string),
            supabase.from("user_memory").select("structured_memory").eq("user_id", user.id).maybeSingle(),
        ]);

        const { data: memoryData, error: memorySelectError } = memResult;
        if (memorySelectError) {
            console.error("user_memory select error:", memorySelectError.message, memorySelectError);
        }

        const memoryContent = memoryData?.structured_memory
            ? JSON.stringify(memoryData.structured_memory, null, 2)
            : "No overarching memory yet.";
        let systemContext = THERAPIST_SYSTEM_PROMPT;
        systemContext += `\n\n## Overarching User Memory Profile:\n${memoryContent}`;
        if (conversationSummary) {
            systemContext += `\n\n## Current Conversation Summary:\n${conversationSummary}`;
        }
        if (retrievedContext) {
            systemContext += `\n\n## Relevant Past Context (Retrieved Semantic Memories):\n${retrievedContext}\n(Note: Use these past memories gently and naturally if they are relevant to the user's current problem.)`;
        }

        const geminiContents: { role: string; parts: { text: string }[] }[] = [];
        const recentTranscript = transcript.slice(-MESSAGE_CONTEXT_LIMIT);
        for (const msg of recentTranscript) {
            geminiContents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
            });
        }

        const conversationIdStr = convId as string;

        /** REST streaming expects SSE (`alt=sse`); without it the body format may not match our parser and the model output appears empty → generic fallback reply. */
        const streamUrl = `${GEMINI_STREAM_URL}?${new URLSearchParams({
            key: apiKey,
            alt: "sse",
        })}`;

        const streamBody = JSON.stringify({
            system_instruction: { parts: [{ text: systemContext }] },
            contents: geminiContents,
            generationConfig: {
                temperature: 0.85,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });

        const saveUserTurn = saveTranscript(transcript).then(() =>
            ingestUserMessageIntoRagBuffer(supabase, convId as string, user.id, message, apiKey)
        );
        let geminiResponse: Response;
        try {
            geminiResponse = await fetch(streamUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: streamBody,
                signal: request.signal,
            });
        } catch (e) {
            await saveUserTurn;
            if (e instanceof Error && e.name === "AbortError") {
                return new Response(null, { status: 499 });
            }
            throw e;
        }
        await saveUserTurn;

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error("Gemini stream error:", geminiResponse.status, errText);
            return Response.json(
                { error: "AI service error. Please try again." },
                { status: 502 }
            );
        }

        const encoder = new TextEncoder();
        let fullAi = "";

        const stream = new ReadableStream({
            async start(controller) {
                const send = (obj: object) => {
                    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
                };

                send({
                    type: "meta",
                    conversationId: conversationIdStr,
                    isNewConversation,
                });

                try {
                    for await (const fragment of readGeminiTextStream(geminiResponse)) {
                        if (request.signal.aborted) {
                            break;
                        }
                        fullAi += fragment;
                        send({ type: "t", d: fragment });
                    }

                    if (request.signal.aborted) {
                        return;
                    }

                    const aiResponse =
                        fullAi.trim() ||
                        "I'm here for you. Could you tell me more about what you're going through?";

                    transcript.push({ role: "assistant", content: aiResponse });
                    await saveTranscript(transcript);

                    await supabase
                        .from("conversations")
                        .update({ updated_at: new Date().toISOString() })
                        .eq("id", conversationIdStr);

                    if (transcript.length % 2 === 0) {
                        await updateSummaryAndMemory(
                            conversationIdStr,
                            user.id,
                            transcript,
                            memoryContent,
                            supabase
                        );
                    }

                    await flushRagBufferTailAfterTurn(
                        supabase,
                        conversationIdStr,
                        user.id,
                        apiKey
                    );

                    send({ type: "done", full: aiResponse });
                } catch (e) {
                    if (request.signal.aborted) {
                        return;
                    }
                    console.error("Stream processing error:", e);
                    send({
                        type: "error",
                        message: e instanceof Error ? e.message : "Stream failed",
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal server error";
        console.error("Chat stream error:", error);
        return Response.json({ error: msg }, { status: 500 });
    }
}
