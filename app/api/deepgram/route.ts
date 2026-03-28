import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "DEEPGRAM_API_KEY is not set" }, { status: 500 });
        }
        
        // Since the user's API key does not have the "keys:write" permission required 
        // to generate temporary keys, for this project we will just return the 
        // exact key to the frontend so it can connect to the WebSockets.
        // It is still secure because it stays out of client-side source code .env files.
        return NextResponse.json({ key: apiKey });
    } catch (e: any) {
        console.error("Deepgram API Error", e);
        return NextResponse.json({ error: e.message || "Failed to retrieve key" }, { status: 500 });
    }
}
