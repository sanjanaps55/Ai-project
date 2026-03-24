import { createClient } from "@/utils/supabase/server";
import { THERAPIST_SYSTEM_PROMPT, SUMMARY_PROMPT, buildConversationTitle } from "@/utils/therapist-prompt";
import { NextRequest } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
                return Response.json({ error: "Failed to create conversation" }, { status: 500 });
            }

            convId = newConv.id;
            isNewConversation = true;
        }

        // Save the user message
        await supabase.from("messages").insert({
            conversation_id: convId,
            role: "user",
            content: message,
        });

        // Fetch conversation summary for context
        const { data: conversation } = await supabase
            .from("conversations")
            .select("summary")
            .eq("id", convId)
            .single();

        // Fetch recent messages for context (last 20)
        const { data: recentMessages } = await supabase
            .from("messages")
            .select("role, content")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: true })
            .limit(20);

        // Build context for Gemini
        const conversationSummary = conversation?.summary || "";
        const contextParts: { text: string }[] = [];

        // Add system instruction context
        let systemContext = THERAPIST_SYSTEM_PROMPT;
        if (conversationSummary) {
            systemContext += `\n\n## Previous Conversation Context:\n${conversationSummary}`;
        }

        // Build the message history for Gemini
        const geminiContents: { role: string; parts: { text: string }[] }[] = [];

        if (recentMessages && recentMessages.length > 0) {
            for (const msg of recentMessages) {
                geminiContents.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }],
                });
            }
        }

        // Call Gemini API
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            }),
        });

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
        await supabase.from("messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: aiResponse,
        });

        // Update conversation timestamp
        await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);

        // Count messages to check if we should update the summary
        const { count: msgCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", convId);

        // Update summary every 10 messages
        if (msgCount && msgCount % 10 === 0) {
            updateSummary(convId, supabase, recentMessages || []);
        }

        return Response.json({
            response: aiResponse,
            conversationId: convId,
            isNewConversation,
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Background summary update (non-blocking)
async function updateSummary(
    conversationId: string,
    supabase: Awaited<ReturnType<typeof createClient>>,
    messages: { role: string; content: string }[]
) {
    try {
        const messageText = messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        const summaryResponse = await fetch(
            `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SUMMARY_PROMPT }],
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: `Summarize this therapy conversation:\n\n${messageText}` }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 300,
                    },
                }),
            }
        );

        if (summaryResponse.ok) {
            const data = await summaryResponse.json();
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (summary) {
                await supabase
                    .from("conversations")
                    .update({ summary })
                    .eq("id", conversationId);
            }
        }
    } catch (error) {
        console.error("Summary update error:", error);
    }
}
