type GeminiStreamChunk = {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function extractTextFromChunk(obj: GeminiStreamChunk): string {
    const parts = obj.candidates?.[0]?.content?.parts;
    if (!parts?.length) return "";
    return parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
}

/**
 * Parse Gemini streamGenerateContent with `alt=sse`: SSE lines `data: { ... }`.
 * Also tolerates newline-delimited JSON without the `data:` prefix.
 */
export async function* readGeminiTextStream(response: Response): AsyncGenerator<string> {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line || line === "[DONE]") continue;
            if (line.startsWith("event:")) continue;

            let jsonStr = line.startsWith("data:") ? line.slice(5).trim() : line;
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
                const obj = JSON.parse(jsonStr) as GeminiStreamChunk;
                const t = extractTextFromChunk(obj);
                if (t) yield t;
            } catch {
                /* ignore partial / non-JSON lines */
            }
        }
    }

    const tail = buffer.trim();
    if (tail && tail !== "[DONE]") {
        const jsonStr = tail.startsWith("data:") ? tail.slice(5).trim() : tail;
        if (jsonStr && jsonStr !== "[DONE]") {
            try {
                const obj = JSON.parse(jsonStr) as GeminiStreamChunk;
                const t = extractTextFromChunk(obj);
                if (t) yield t;
            } catch {
                /* ignore */
            }
        }
    }
}
