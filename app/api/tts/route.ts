import { NextRequest, NextResponse } from "next/server";

/** Collapse excessive newlines for cleaner TTS without changing meaning. */
function normalizeForTts(text: string): string {
    return text.replace(/\n{3,}/g, "\n\n").trim();
}

type TtsProvider = "elevenlabs" | "deepgram";

function resolveProvider(): TtsProvider {
    const raw = process.env.TTS_PROVIDER?.trim().toLowerCase();
    if (raw === "deepgram") return "deepgram";
    if (raw === "elevenlabs") return "elevenlabs";
    // Default: ElevenLabs when configured (faster turbo + streaming endpoint).
    if (process.env.ELEVENLABS_API_KEY?.trim()) return "elevenlabs";
    return "deepgram";
}

async function ttsElevenLabs(text: string): Promise<Response> {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    const voiceId =
        process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
    const modelId =
        process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_turbo_v2_5";

    if (!apiKey) {
        return NextResponse.json(
            { error: "ELEVENLABS_API_KEY is not set" },
            { status: 500 }
        );
    }

    // /stream returns chunked MPEG audio — faster time-to-first-byte than buffered endpoint.
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs error (${response.status}): ${errText.slice(0, 500)}`);
    }

    return new NextResponse(response.body, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
        },
    });
}

async function ttsDeepgram(text: string): Promise<Response> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "DEEPGRAM_API_KEY is not set" },
            { status: 500 }
        );
    }

    const model = process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-asteria-en";
    const speakUrl = new URL(`https://api.deepgram.com/v1/speak`);
    speakUrl.searchParams.set("model", model);

    const response = await fetch(speakUrl.toString(), {
        method: "POST",
        headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Deepgram error: ${error}`);
    }

    return new NextResponse(response.body, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
        },
    });
}

export async function GET(req: NextRequest) {
    return handleTts(req);
}

export async function POST(req: NextRequest) {
    return handleTts(req);
}

async function handleTts(req: NextRequest) {
    try {
        let text = "";
        if (req.method === "GET") {
            text = req.nextUrl.searchParams.get("text") || "";
        } else {
            const body = await req.json();
            text = body.text || "";
        }

        if (!text) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const normalized = normalizeForTts(String(text));
        if (!normalized) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const provider = resolveProvider();

        if (provider === "elevenlabs") {
            return await ttsElevenLabs(normalized);
        }
        return await ttsDeepgram(normalized);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to generate TTS";
        console.error("TTS API Error:", e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
