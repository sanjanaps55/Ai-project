import { createClient } from "@/utils/supabase/server";
import { SUMMARY_PROMPT, MEMORY_UPDATE_PROMPT } from "@/utils/therapist-prompt";

const GEMINI_GEN_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SENTIMENT_PROMPT = `Analyze the emotional state of the user in this conversation snippet. 
Score the following 4 emotions from 0 to 100 based on the user's text: "joy", "anxiety", "sadness", "anger". 
Return purely a structured JSON object with exactly these 4 keys (integers). Example:
{"joy": 20, "anxiety": 80, "sadness": 10, "anger": 0}`;

export async function fetchConversationSummaryForContext(
    supabase: Awaited<ReturnType<typeof createClient>>,
    conversationId: string
): Promise<string> {
    const { data: conv } = await supabase
        .from("conversations")
        .select("summary")
        .eq("id", conversationId)
        .single();

    return (conv?.summary as string) || "";
}

export async function linkConversationToMessage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    conversationId: string,
    messagesRowId: string
): Promise<void> {
    const { error } = await supabase
        .from("conversations")
        .update({ message_id: messagesRowId })
        .eq("id", conversationId);
    if (error) {
        console.error("linkConversationToMessage error:", error);
    }
}

export async function updateSummaryAndMemory(
    conversationId: string,
    userId: string,
    transcript: { role: string; content: string }[],
    currentMemoryContent: string,
    supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
    try {
        const recentMessagesText = transcript.slice(-30).map((m) => `${m.role}: ${m.content}`).join("\n");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        const summaryPromise = fetch(`${GEMINI_GEN_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SUMMARY_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: `Summarize this therapy conversation:\n\n${recentMessagesText}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
            }),
        });

        const memoryPromise = fetch(`${GEMINI_GEN_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: MEMORY_UPDATE_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: `Current Memory Profile:\n${currentMemoryContent}\n\nRecent Conversation snippet:\n${recentMessagesText}\n\nExtract and return the updated structured JSON memory profile.` }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
            }),
        });

        const sentimentPromise = fetch(`${GEMINI_GEN_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SENTIMENT_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: `Conversation:\n${recentMessagesText}` }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
            }),
        });

        const [summaryResponse, memoryResponse, sentimentResponse] = await Promise.all([
            summaryPromise,
            memoryPromise,
            sentimentPromise
        ]);

        if (summaryResponse.ok) {
            const data = await summaryResponse.json();
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (summary) {
                const { error: summaryError } = await supabase
                    .from("conversations")
                    .update({ summary })
                    .eq("id", conversationId);
                if (summaryError) {
                    console.error("conversations.summary update error:", summaryError);
                }
            }
        }

        if (memoryResponse.ok) {
            const data = await memoryResponse.json();
            const memoryJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (memoryJsonStr) {
                try {
                    const cleanMemoryStr = memoryJsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsedMemory = JSON.parse(cleanMemoryStr);
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

        if (sentimentResponse.ok) {
            const data = await sentimentResponse.json();
            const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (jsonStr) {
                try {
                    const cleanSentimentStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(cleanSentimentStr);
                    const { error } = await supabase.from("sentiment_logs").insert({
                        user_id: userId,
                        conversation_id: conversationId,
                        joy_score: parsed.joy || 0,
                        anxiety_score: parsed.anxiety || 0,
                        sadness_score: parsed.sadness || 0,
                        anger_score: parsed.anger || 0,
                    });
                    if (error) console.error("Sentiment log insertion error:", error);
                } catch (e) {
                    console.error("Failed to parse Gemini JSON output for sentiment:", jsonStr);
                }
            }
        }
    } catch (error) {
        console.error("Summary/Memory update error:", error);
    }
}
