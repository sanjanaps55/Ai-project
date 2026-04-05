"""
Nova Therapist -- LiveKit voice agent.

Uses:  Deepgram STT  |  Google Gemini LLM  |  ElevenLabs TTS  |  Silero VAD
Stores conversation transcripts in Supabase (conversations + messages tables).

Run locally:
    python main.py dev          # auto-joins any new room
    python main.py start        # production mode
"""

import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

from livekit import agents
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    JobContext,
    RoomInputOptions,
    ChatContext,
    cli,
)
from livekit.plugins import deepgram, google, elevenlabs, silero

load_dotenv()

# LiveKit ElevenLabs plugin reads ELEVEN_API_KEY (not ELEVENLABS_API_KEY).
if not os.getenv("ELEVEN_API_KEY") and os.getenv("ELEVENLABS_API_KEY"):
    os.environ["ELEVEN_API_KEY"] = os.environ["ELEVENLABS_API_KEY"]

# ── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EST9Ui6982FZPSi7gCHi")

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("nova-agent")

# ── Supabase client (optional -- gracefully degrades if missing) ──────────────

db: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        db = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialised")
    except Exception as exc:
        logger.error("Supabase init failed: %s", exc)
else:
    logger.warning(
        "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set -- DB persistence disabled"
    )

# ── System prompt ─────────────────────────────────────────────────────────────

NOVA_SYSTEM_PROMPT = (
    "You are Nova -- an empathetic, calm, and thoughtful AI therapist. "
    "Support users through natural, human-like conversation. "
    "Keep responses concise (2-4 sentences) since this is a voice conversation. "
    "Be warm, validating, and ask one gentle follow-up question. "
    "Never diagnose or prescribe medication. "
    "If someone expresses thoughts of self-harm or is in crisis, gently encourage "
    "them to contact a crisis helpline (988 Suicide & Crisis Lifeline) or "
    "emergency services."
)


# ── Agent ─────────────────────────────────────────────────────────────────────

class NovaTherapistAgent(Agent):
    """Voice-first therapist agent backed by Gemini."""

    def __init__(self, chat_ctx: ChatContext):
        super().__init__(instructions=NOVA_SYSTEM_PROMPT, chat_ctx=chat_ctx)


# ── Helpers: transcript persistence ───────────────────────────────────────────

def _extract_transcript(session: AgentSession) -> list[dict]:
    """Best-effort extraction of the conversation from the AgentSession."""
    transcript: list[dict] = []
    try:
        chat_ctx = getattr(session, "chat_ctx", None)
        if chat_ctx is None:
            return transcript

        items = getattr(chat_ctx, "items", None) or getattr(
            chat_ctx, "messages", []
        )
        for item in items:
            role_raw = getattr(item, "role", None)
            if role_raw is None:
                continue
            role = str(role_raw)
            if "user" in role.lower():
                role = "user"
            elif "assistant" in role.lower() or "model" in role.lower():
                role = "assistant"
            else:
                continue

            content = getattr(item, "text_content", None) or getattr(
                item, "content", ""
            )
            if isinstance(content, list):
                content = " ".join(str(c) for c in content)
            content = str(content).strip()
            if content:
                transcript.append({"role": role, "content": content})
    except Exception as exc:
        logger.error("Transcript extraction failed: %s", exc)
    return transcript


def _is_valid_uuid(value: str) -> bool:
    return len(value) == 36 and value.count("-") == 4


async def _persist_transcript(
    transcript: list[dict],
    room_name: str,
    user_identity: str | None = None,
) -> None:
    """Save transcript to Supabase (conversations + messages tables)."""
    if not db or not transcript:
        return
    try:
        conv_data: dict = {
            "title": (
                f"Voice - "
                f"{datetime.now(timezone.utc).strftime('%b %d, %Y %I:%M %p')}"
            ),
            "summary": "",
        }
        if user_identity and _is_valid_uuid(user_identity):
            conv_data["user_id"] = user_identity

        result = db.table("conversations").insert(conv_data).execute()
        if not result.data:
            logger.error("conversations insert returned no data")
            return

        conv_id = result.data[0]["id"]

        msg_result = (
            db.table("messages")
            .insert({"conversation_id": conv_id, "transcript": transcript})
            .execute()
        )

        if msg_result.data:
            msg_id = msg_result.data[0]["id"]
            db.table("conversations").update({"message_id": msg_id}).eq(
                "id", conv_id
            ).execute()

        logger.info(
            "Transcript persisted: conv=%s (%d turns)", conv_id, len(transcript)
        )
    except Exception as exc:
        logger.error("Transcript persistence failed: %s", exc)


# ── Agent server (v1.5 API) ───────────────────────────────────────────────────

server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info("Job received — connecting to room …")
    await ctx.connect()
    logger.info("Connected to room: %s  (sid=%s)", ctx.room.name, ctx.room.sid)

    chat_ctx = ChatContext()
    agent = NovaTherapistAgent(chat_ctx=chat_ctx)

    session = AgentSession(
        stt=deepgram.STT(),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=elevenlabs.TTS(voice_id=ELEVENLABS_VOICE_ID),
        vad=silero.VAD.load(),
        userdata={},
    )

    # Identify the human participant (for DB user_id linkage).
    user_identity: str | None = None
    for p in ctx.room.remote_participants.values():
        ident = getattr(p, "identity", None) or ""
        if ident and not ident.startswith("nova"):
            user_identity = ident
            break

    async def on_shutdown():
        transcript = _extract_transcript(session)
        await _persist_transcript(transcript, ctx.room.name, user_identity)

    ctx.add_shutdown_callback(on_shutdown)

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(),
    )

    await session.generate_reply(
        instructions=(
            "Greet the user warmly. Say something like: "
            "'Hi, I'm Nova. How are you feeling today?'"
        )
    )
    logger.info("Nova therapist agent is running in room %s", ctx.room.name)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(server)
