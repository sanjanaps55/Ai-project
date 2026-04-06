/**
 * RAG storage: one vector row per *chunk* of user text (several short messages or one long one),
 * not one row per keystroke-sized line. Reduces embedding API calls and DB rows long-term.
 */

import type { createClient } from "@/utils/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const GEMINI_EMBED_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent";

export type EmbedTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

/** Flush a chunk when buffer is this large (characters). */
export const RAG_CHUNK_MAX_CHARS = 360;
/** Or when this many user messages are accumulated. */
export const RAG_CHUNK_MAX_MSGS = 5;

/** After assistant reply, flush leftover buffer if at least this many chars… */
export const RAG_TAIL_MIN_CHARS = 72;
/** …or at least this many user messages in the buffer. */
export const RAG_TAIL_MIN_MSGS = 2;

/**
 * Short but identity-heavy facts should be embedded immediately at turn end,
 * otherwise they can remain buffered and become non-retrievable later.
 */
function looksLikePersonalFact(text: string): boolean {
    const t = text.toLowerCase();
    return (
        /\bmy\b/.test(t) &&
        (
            /\bname is\b/.test(t) ||
            /\bi am\b/.test(t) ||
            /\bi'm\b/.test(t) ||
            /\bchildhood\b/.test(t) ||
            /\bdog\b/.test(t) ||
            /\bcat\b/.test(t) ||
            /\bpet\b/.test(t) ||
            /\bfavorite\b/.test(t) ||
            /\bbirthday\b/.test(t) ||
            /\bfrom\b/.test(t)
        )
    );
}

export async function getEmbedding(
    text: string,
    apiKey: string,
    taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT"
): Promise<number[] | null> {
    try {
        const response = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-2-preview",
                content: { parts: [{ text }] },
                outputDimensionality: 768,
                taskType,
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini Embedding API Error:", response.status, errText);
            return null;
        }
        const data = (await response.json()) as {
            embedding?: { values?: number[] };
        };
        const values = data.embedding?.values;
        if (!values?.length) {
            console.error("Gemini embed response missing embedding.values", JSON.stringify(data).slice(0, 500));
            return null;
        }
        if (values.length !== 768) {
            console.error(`Embedding length mismatch: got ${values.length}, expected 768`);
            return null;
        }
        return values;
    } catch (e) {
        console.error("Embedding generation error:", e);
        return null;
    }
}

function appendToBuffer(prevText: string, userMessage: string): string {
    const t = userMessage.trim();
    if (!t) return prevText;
    return prevText ? `${prevText}\n\n${t}` : t;
}

async function insertRagChunk(
    supabase: SupabaseServer,
    conversationId: string,
    userId: string,
    chunkText: string,
    sourceMessageCount: number,
    embedding: number[]
): Promise<boolean> {
    const { error } = await supabase.from("message_embeddings").insert({
        conversation_id: conversationId,
        user_id: userId,
        content: chunkText,
        embedding,
        source_message_count: sourceMessageCount,
    });
    if (error) {
        console.error("message_embeddings insert error:", error);
        return false;
    }
    console.log(
        "🟢 RAG chunk stored:",
        sourceMessageCount,
        "user line(s),",
        chunkText.length,
        "chars,",
        "preview:",
        chunkText.slice(0, 120) + (chunkText.length > 120 ? "…" : "")
    );
    return true;
}

async function clearBuffer(supabase: SupabaseServer, conversationId: string): Promise<void> {
    await supabase
        .from("conversations")
        .update({ memory_rag_buffer: "", memory_rag_buffer_msgs: 0 })
        .eq("id", conversationId);
}

/**
 * After each user message: append to per-conversation buffer; if thresholds met, embed once and clear.
 */
export async function ingestUserMessageIntoRagBuffer(
    supabase: SupabaseServer,
    conversationId: string,
    userId: string,
    userMessage: string,
    apiKey: string
): Promise<void> {
    const { data: row, error: selErr } = await supabase
        .from("conversations")
        .select("memory_rag_buffer, memory_rag_buffer_msgs")
        .eq("id", conversationId)
        .single();

    if (selErr) {
        console.error("RAG buffer read error:", selErr);
        return;
    }

    const prevText = (row?.memory_rag_buffer as string) ?? "";
    const prevCount = (row?.memory_rag_buffer_msgs as number) ?? 0;

    let buf = appendToBuffer(prevText, userMessage);
    let cnt = prevCount + (userMessage.trim() ? 1 : 0);

    const flushNow = buf.length >= RAG_CHUNK_MAX_CHARS || cnt >= RAG_CHUNK_MAX_MSGS;

    if (flushNow && buf.length > 0) {
        const embedding = await getEmbedding(buf, apiKey, "RETRIEVAL_DOCUMENT");
        if (embedding) {
            const ok = await insertRagChunk(supabase, conversationId, userId, buf, cnt, embedding);
            if (ok) {
                await clearBuffer(supabase, conversationId);
                return;
            }
        }
        const { error: upErr } = await supabase
            .from("conversations")
            .update({ memory_rag_buffer: buf, memory_rag_buffer_msgs: cnt })
            .eq("id", conversationId);
        if (upErr) {
            console.error("RAG buffer persist after failed flush:", upErr);
        }
    } else {
        const { error: upErr } = await supabase
            .from("conversations")
            .update({ memory_rag_buffer: buf, memory_rag_buffer_msgs: cnt })
            .eq("id", conversationId);
        if (upErr) {
            console.error("RAG buffer update error:", upErr);
        }
    }
}

/**
 * After assistant finishes: flush small leftover buffer so short exchanges still become retrievable.
 */
export async function flushRagBufferTailAfterTurn(
    supabase: SupabaseServer,
    conversationId: string,
    userId: string,
    apiKey: string
): Promise<void> {
    const { data: row, error: selErr } = await supabase
        .from("conversations")
        .select("memory_rag_buffer, memory_rag_buffer_msgs")
        .eq("id", conversationId)
        .single();

    if (selErr) {
        console.error("RAG tail read error:", selErr);
        return;
    }

    const buf = ((row?.memory_rag_buffer as string) ?? "").trim();
    const cnt = (row?.memory_rag_buffer_msgs as number) ?? 0;

    if (!buf) return;

    const shouldFlush =
        buf.length >= RAG_TAIL_MIN_CHARS ||
        cnt >= RAG_TAIL_MIN_MSGS ||
        looksLikePersonalFact(buf);
    if (!shouldFlush) {
        return;
    }

    const embedding = await getEmbedding(buf, apiKey, "RETRIEVAL_DOCUMENT");
    if (embedding) {
        const ok = await insertRagChunk(supabase, conversationId, userId, buf, cnt, embedding);
        if (ok) {
            await clearBuffer(supabase, conversationId);
        }
    }
}
