import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();
        const apiKey = process.env.DEEPGRAM_API_KEY;

        if (!text || !apiKey) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        // Using Deepgram Aura - specifically optimized for high-speed, human-like conversations
        const response = await fetch(`https://api.deepgram.com/v1/speak?model=aura-asteria-en`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: text,
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Deepgram error: ${error}`);
        }

        // Stream the response directly to the client as an mpeg stream
        return new NextResponse(response.body, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
            }
        });

    } catch (e: any) {
        console.error("TTS API Error:", e);
        return NextResponse.json({ error: e.message || "Failed to generate TTS" }, { status: 500 });
    }
}
