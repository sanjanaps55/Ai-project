import { createClient } from "@/utils/supabase/server";
import { THERAPIST_SYSTEM_PROMPT, buildConversationTitle } from "@/utils/therapist-prompt";
import {
    fetchConversationSummaryForContext,
    linkConversationToTranscriptMessage,
    updateSummaryAndMemory,
} from "@/app/api/chat/summary-memory";
import { NextRequest } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MESSAGE_CONTEXT_LIMIT = 30; // Maximum messages to send to gemini to prevent token limit

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, conversationId } = await request.json();

        if (!message || typeof message !== "string") {
            return Response.json({ error: "Message is required" }, { status: 400 });
        }

        // Create or fetch conversation
        let convId = conversationId;
        let isNewConversation = false;

        if (!convId) {
            // Create a new conversation
            const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                    user_id: user.id,
                    title: buildConversationTitle(message),
                })
                .select("id")
                .single();

            if (convError || !newConv) {
                console.error("Failed to create conversation:", convError);
                return Response.json({ error: "Failed to create conversation in database" }, { status: 500 });
            }

            convId = newConv.id;
            isNewConversation = true;
        } else {
            // Verify the conversation exists to prevent silent foreign key failures
            const { data: existingConv, error: checkError } = await supabase
                .from("conversations")
                .select("id")
                .eq("id", convId)
                .single();
            
            if (checkError || !existingConv) {
                console.error("Conversation ID not found in database:", convId, checkError);
                return Response.json({ error: "Conversation not found. It may have been deleted. Please start a new chat." }, { status: 404 });
            }
        }

        // Fetch current transcript
        const { data: msgData, error: selectError } = await supabase
            .from("messages")
            .select("id, conversation_id, transcript")
            .eq("conversation_id", convId)
            .limit(1);

        if (selectError) {
            console.error("Select transcript error:", selectError);
        }

        const existingRow = msgData && msgData.length > 0 ? msgData[0] : null;
        let transcript: { role: string; content: string }[] =
            (existingRow?.transcript as { role: string; content: string }[]) || [];
        let isExistingRow = !!existingRow;
        let messagesRowId: string | null = (existingRow?.id as string) ?? null;

        const saveTranscript = async (t: { role: string; content: string }[]) => {
            if (isExistingRow && messagesRowId) {
                const { error } = await supabase.from("messages").update({ transcript: t }).eq("id", messagesRowId);
                if (error) console.error("Update transcript error:", error);
            } else if (isExistingRow) {
                const { error } = await supabase.from("messages").update({ transcript: t }).eq("conversation_id", convId);
                if (error) console.error("Update transcript error:", error);
            } else {
                const { data: inserted, error } = await supabase
                    .from("messages")
                    .insert({ conversation_id: convId, transcript: t })
                    .select("id")
                    .single();
                if (error) {
                    console.error("Insert transcript error:", error);
                } else if (inserted?.id) {
                    messagesRowId = inserted.id as string;
                    isExistingRow = true;
                    await linkConversationToTranscriptMessage(supabase, convId as string, messagesRowId);
                }
            }
        };

        // Save the user message (append)
        transcript.push({ role: "user", content: message });

        const [conversationSummary, memResult] = await Promise.all([
            fetchConversationSummaryForContext(supabase, convId as string),
            supabase.from("user_memory").select("structured_memory").eq("user_id", user.id).maybeSingle(),
        ]);

        const { data: memoryData } = memResult;

        const memoryContent = memoryData?.structured_memory
            ? JSON.stringify(memoryData.structured_memory, null, 2)
            : "No overarching memory yet.";
        let systemContext = THERAPIST_SYSTEM_PROMPT;
        
        systemContext += `\n\n## Overarching User Memory Profile:\n${memoryContent}`;

        if (conversationSummary) {
            systemContext += `\n\n## Current Conversation Summary:\n${conversationSummary}`;
        }

        // Build the message history for Gemini (limit to last N for safety)
        const geminiContents: { role: string; parts: { text: string }[] }[] = [];
        
        const recentTranscript = transcript.slice(-MESSAGE_CONTEXT_LIMIT);
        
        for (const msg of recentTranscript) {
            geminiContents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
            });
        }

        const geminiPayload = JSON.stringify({
            system_instruction: {
                parts: [{ text: systemContext }],
            },
            contents: geminiContents,
            generationConfig: {
                temperature: 0.85,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });

        const saveUserTurn = saveTranscript(transcript);
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: geminiPayload,
        });
        await saveUserTurn;

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", geminiResponse.status, errorText);
            
            if (geminiResponse.status === 429) {
                return Response.json({ 
                    error: "Rate limit reached. The free Gemini API has a limit of 15 requests per minute. Please wait a moment and try again." 
                }, { status: 429 });
            }
            if (geminiResponse.status === 400) {
                return Response.json({ 
                    error: "Invalid request to AI. Please try a different message." 
                }, { status: 400 });
            }
            if (geminiResponse.status === 403) {
                return Response.json({ 
                    error: "API key is invalid or disabled. Please check your GEMINI_API_KEY in .env.local." 
                }, { status: 403 });
            }
            if (geminiResponse.status === 404) {
                return Response.json({
                    error: "Gemini model not found for this API/version. Try a supported model like gemini-1.5-flash-latest or check your API access."
                }, { status: 404 });
            }
            return Response.json({ error: "AI service error. Please try again." }, { status: 502 });
        }

        const geminiData = await geminiResponse.json();
        const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here for you. Could you tell me more about what you're going through?";

        // Save AI response to DB
        transcript.push({ role: "assistant", content: aiResponse });
        await saveTranscript(transcript);

        // Update conversation timestamp
        const { error: tsError } = await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);

        if (tsError) {
            console.error("Conversation timestamp update error:", tsError);
        }

        if (transcript.length % 2 === 0) {
            await updateSummaryAndMemory(messagesRowId, user.id, transcript, memoryContent, supabase);
        }

        return Response.json({
            response: aiResponse,
            conversationId: convId,
            isNewConversation,
        });

    } catch (error: any) {
        console.error("Chat API Error:", error.message || error);
        return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
