/**
 * Verifies ELEVENLABS_API_KEY from .env.local (no extra deps).
 * Run: node scripts/check-elevenlabs.mjs
 */
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const key = env.ELEVENLABS_API_KEY;
if (!key) {
    console.error("ELEVENLABS_API_KEY not found in .env.local");
    process.exit(1);
}

const voiceId = env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";

// Scoped keys may lack user_read / voices_read; TTS-only check (uses a few characters of quota).
const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
        method: "POST",
        headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text: "ok",
            model_id: "eleven_turbo_v2_5",
        }),
    }
);

const body = await res.text();
console.log("POST /v1/text-to-speech status:", res.status);
if (res.ok) {
    console.log("ElevenLabs API key works for text-to-speech.");
    process.exit(0);
}

console.error("TTS check failed:", body.slice(0, 500));
if (body.includes("text_to_speech")) {
    console.error(
        "\n→ In ElevenLabs: API Keys → create or edit a key and enable **Text to speech** (and pick a voice that matches ELEVENLABS_VOICE_ID)."
    );
    console.error(
        "→ Until then, add TTS_PROVIDER=deepgram to .env.local to keep using Deepgram for Nova’s voice.\n"
    );
}
process.exit(1);
