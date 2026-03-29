import { createClient } from "@/utils/supabase/server";
import { SUMMARY_PROMPT, MEMORY_UPDATE_PROMPT } from "@/utils/therapist-prompt";

const GEMINI_GEN_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function fetchConversationSummaryForContext(
    supabase: Awaited<ReturnType<typeof createClient>>,
    conversationId: string
): Promise<string> {
    const { data: conv } = await supabase
        .from("conversations")
        .select("transcript_message_id")
        .eq("id", conversationId)
        .single();

    const msgId = conv?.transcript_message_id as string | null | undefined;
    if (msgId) {
        const { data: row } = await supabase.from("messages").select("summary").eq("id", msgId).single();
        return (row?.summary as string) || "";
    }

    const { data: fallback } = await supabase
        .from("messages")
        .select("summary")
        .eq("conversation_id", conversationId)
        .limit(1)
        .maybeSingle();

    return (fallback?.summary as string) || "";
}

export async function linkConversationToTranscriptMessage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    conversationId: string,
    messagesRowId: string
): Promise<void> {
    const { error } = await supabase
        .from("conversations")
        .update({ transcript_message_id: messagesRowId })
        .eq("id", conversationId);
    if (error) {
        console.error("linkConversationToTranscriptMessage error:", error);
    }
}

export async function updateSummaryAndMemory(
    messagesRowId: string | null,
    userId: string,
    transcript: { role: string; content: string }[],
    currentMemoryContent: string,
    supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
    try {
        const recentMessagesText = transcript.slice(-30).map((m) => `${m.role}: ${m.content}`).join("\n");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        const summaryResponse = await fetch(`${GEMINI_GEN_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SUMMARY_PROMPT }] },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Summarize this therapy conversation:\n\n${recentMessagesText}` }],
                    },
                ],
                generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
            }),
        });

        if (summaryResponse.ok) {
            const data = await summaryResponse.json();
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (summary && messagesRowId) {
                const { error: summaryError } = await supabase
                    .from("messages")
                    .update({ summary })
                    .eq("id", messagesRowId);
                if (summaryError) {
                    console.error("messages.summary update error:", summaryError);
                }
            }
        }

        const memoryResponse = await fetch(`${GEMINI_GEN_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: MEMORY_UPDATE_PROMPT }] },
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Current Memory Profile:\n${currentMemoryContent}\n\nRecent Conversation snippet:\n${recentMessagesText}\n\nExtract and return the updated structured JSON memory profile.`,
                            },
                        ],
                    },
                ],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
            }),
        });

        if (memoryResponse.ok) {
            const data = await memoryResponse.json();
            const memoryJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (memoryJsonStr) {
                try {
                    const parsedMemory = JSON.parse(memoryJsonStr);
                    const { data: memData } = await supabase
                        .from("user_memory")
                        .select("user_id")
                        .eq("user_id", userId)
                        .limit(1);
                    if (memData && memData.length > 0) {
                        const { error } = await supabase
                            .from("user_memory")
                            .update({ structured_memory: parsedMemory })
                            .eq("user_id", userId);
                        if (error) console.error("User memory update error:", error);
                    } else {
                        const { error } = await supabase.from("user_memory").insert({
                            user_id: userId,
                            structured_memory: parsedMemory,
                        });
                        if (error) console.error("User memory insert error:", error);
                    }
                } catch (e) {
                    console.error("Failed to parse Gemini JSON output for memory:", memoryJsonStr);
                }
            }
        }
    } catch (error) {
        console.error("Summary/Memory update error:", error);
    }
}
