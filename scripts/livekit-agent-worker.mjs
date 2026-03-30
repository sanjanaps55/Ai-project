/**
 * LiveKit voice agent worker (Node).
 * Joins a LiveKit room, subscribes to user audio, runs STT -> LLM -> TTS,
 * and publishes agent audio back into the room.
 *
 * Usage:
 *   npm run agent:worker -- --room room_<uuid>
 *   npm run agent:worker -- --room nova-lobby
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { AccessToken } from "livekit-server-sdk";
import {
  Room,
  RoomEvent,
  TrackKind,
  AudioStream,
  AudioSource,
  AudioFrame,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackSource,
} from "@livekit/rtc-node";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function getArg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const env = loadEnvLocal();
const LIVEKIT_URL = process.env.LIVEKIT_URL || env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET || env.LIVEKIT_API_SECRET;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || env.DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || env.ELEVENLABS_VOICE_ID || "EST9Ui6982FZPSi7gCHi";
  console.log(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  console.log(DEEPGRAM_API_KEY, GEMINI_API_KEY);
  console.log(roomName, identity);
const roomName = getArg("room", "nova-lobby");
const identity = getArg("identity", "nova-agent");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are Nova—empathetic, calm, thoughtful AI therapist. Support through natural, human-like talk. Keep responses concise (2-4 sentences) since this is a voice conversation. Be warm, validating, and ask one gentle follow-up question.`;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error(
    "Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET."
  );
  process.exit(1);
}
if (!DEEPGRAM_API_KEY) {
  console.error("Missing DEEPGRAM_API_KEY.");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY.");
  process.exit(1);
}
if (!ELEVENLABS_API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY.");
  process.exit(1);
}
if (roomName.includes("<") || roomName.includes(">")) {
  console.error(
    `Invalid room value: "${roomName}". Use the real room id from client UI, not a placeholder.`
  );
  process.exit(1);
}

// ─── Conversation history (kept in memory per worker session) ───
let conversationHistory = [];

// ─── Token ───
async function buildAgentToken() {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: "Nova Agent",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}

// ─── Gemini LLM ───
async function askGemini(userText) {
  conversationHistory.push({ role: "user", content: userText });

  const geminiContents = conversationHistory.slice(-20).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!res.ok) {
    console.error("[agent] Gemini error:", res.status, await res.text());
    return "I'm here for you. Could you tell me more?";
  }

  const data = await res.json();
  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm here for you. Could you tell me more?";

  conversationHistory.push({ role: "assistant", content: reply });
  return reply;
}

// ─── ElevenLabs TTS → raw PCM Int16 mono 16kHz ───
async function textToSpeechPCM(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=pcm_16000`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    console.error("[agent] ElevenLabs TTS error:", res.status, await res.text());
    return null;
  }

  const arrayBuf = await res.arrayBuffer();
  return new Int16Array(arrayBuf);
}

// ─── Publish PCM as AudioFrames ───
async function publishTTS(audioSource, pcmData) {
  const SAMPLE_RATE = 16000;
  const NUM_CHANNELS = 1;
  const FRAME_SAMPLES = 480; // 30ms at 16kHz

  for (let offset = 0; offset < pcmData.length; offset += FRAME_SAMPLES) {
    const end = Math.min(offset + FRAME_SAMPLES, pcmData.length);
    const chunk = pcmData.subarray(offset, end);
    const frame = new AudioFrame(
      chunk,
      SAMPLE_RATE,
      NUM_CHANNELS,
      chunk.length
    );
    await audioSource.captureFrame(frame);
  }
}

// ─── Deepgram STT via WebSocket ───
function createSTTSocket(onFinalTranscript) {
  const url =
    "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&punctuate=true&utterance_end_ms=1200";

  const ws = new WebSocket(url, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  });

  let utteranceBuf = "";

  ws.on("open", () => {
    console.log("[agent] Deepgram STT connected");
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "Results") {
        const alt = msg.channel?.alternatives?.[0];
        if (alt?.transcript) {
          if (msg.is_final) {
            utteranceBuf += (utteranceBuf ? " " : "") + alt.transcript;
          }
        }
      }
      if (msg.type === "UtteranceEnd" && utteranceBuf.trim()) {
        const final = utteranceBuf.trim();
        utteranceBuf = "";
        console.log(`[agent] STT final: "${final}"`);
        onFinalTranscript(final);
      }
    } catch {
      // ignore parse errors
    }
  });

  ws.on("error", (err) => {
    console.error("[agent] Deepgram STT error:", err.message);
  });

  ws.on("close", () => {
    console.log("[agent] Deepgram STT closed");
  });

  return ws;
}

// ─── Main ───
async function main() {
  const token = await buildAgentToken();
  const room = new Room();

  // Set up audio source for publishing TTS back to the room.
  const audioSource = new AudioSource(16000, 1);
  const agentTrack = LocalAudioTrack.createAudioTrack("agent-voice", audioSource);
  const publishOpts = new TrackPublishOptions();
  publishOpts.source = TrackSource.SOURCE_MICROPHONE;

  let sttSocket = null;
  let isProcessingTurn = false;

  async function handleUserUtterance(text) {
    if (isProcessingTurn) return;
    isProcessingTurn = true;

    try {
      console.log(`[agent] User said: "${text}"`);
      console.log("[agent] Thinking...");
      const reply = await askGemini(text);
      console.log(`[agent] Reply: "${reply}"`);

      console.log("[agent] Synthesizing speech...");
      const pcm = await textToSpeechPCM(reply);
      if (pcm) {
        console.log(`[agent] Publishing ${pcm.length} samples of TTS audio`);
        await publishTTS(audioSource, pcm);
        console.log("[agent] TTS playback done");
      }
    } catch (err) {
      console.error("[agent] Turn error:", err);
    } finally {
      isProcessingTurn = false;
    }
  }

  room.on(RoomEvent.Connected, () => {
    console.log(`[agent] Connected to room: ${roomName} as ${identity}`);
  });

  room.on(RoomEvent.ParticipantConnected, (p) => {
    console.log(`[agent] Participant joined: ${p.identity}`);
  });

  room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
    if (track.kind !== TrackKind.KIND_AUDIO) return;
    console.log(
      `[agent] Subscribed to audio from ${participant.identity} (sid=${publication.trackSid})`
    );

    sttSocket = createSTTSocket(handleUserUtterance);

    // Wait for STT socket to open before streaming.
    await new Promise((resolve, reject) => {
      sttSocket.on("open", resolve);
      sttSocket.on("error", reject);
    });

    const audioStream = new AudioStream(track, 16000, 1);
    for await (const frame of audioStream) {
      if (sttSocket?.readyState === WebSocket.OPEN) {
        const buf = Buffer.from(frame.data.buffer);
        sttSocket.send(buf);
      }
    }
  });

  room.on(RoomEvent.Disconnected, (reason) => {
    console.log(`[agent] Disconnected: ${reason ?? "unknown"}`);
    if (sttSocket?.readyState === WebSocket.OPEN) {
      sttSocket.close();
    }
    process.exit(0);
  });

  await room.connect(LIVEKIT_URL, token);
  await room.localParticipant.publishTrack(agentTrack, publishOpts);
  console.log("[agent] Agent audio track published, waiting for participants...");

  process.on("SIGINT", () => {
    console.log("\n[agent] Shutting down...");
    if (sttSocket?.readyState === WebSocket.OPEN) {
      sttSocket.close();
    }
    room.disconnect();
    process.exit(0);
  });

  // Keep alive.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch((e) => {
  console.error("[agent] Failed:", e);
  process.exit(1);
});
