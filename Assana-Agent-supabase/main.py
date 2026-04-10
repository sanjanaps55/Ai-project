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
import json
from urllib import request as urlrequest
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

# LiveKit Google plugin reads GOOGLE_API_KEY; map from GEMINI_API_KEY if needed.
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

# ── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EST9Ui6982FZPSi7gCHi")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

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
        "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY not set -- DB persistence disabled"
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

    def __init__(self, chat_ctx: ChatContext, memory_context: str = ""):
        instructions = NOVA_SYSTEM_PROMPT
        if memory_context:
            instructions += (
                "\n\nLong-term memory for this user:\n"
                f"{memory_context}\n\n"
                "Use this memory naturally when relevant. "
                "If the user asks what you remember, answer using these details."
            )
        super().__init__(instructions=instructions, chat_ctx=chat_ctx)


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


def _get_embedding_values(text: str) -> list[float] | None:
    if not GEMINI_API_KEY or not text.strip():
        return None
    try:
        payload = {
            "model": "models/gemini-embedding-2-preview",
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": 768,
            "taskType": "RETRIEVAL_QUERY",
        }
        req = urlrequest.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key={GEMINI_API_KEY}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        values = data.get("embedding", {}).get("values")
        if isinstance(values, list) and len(values) == 768:
            return values
        return None
    except Exception as exc:
        logger.warning("Embedding query failed for voice memory: %s", exc)
        return None


def _load_full_voice_memory(user_identity: str | None) -> str:
    """
    Pull voice memory with:
    1) full user_memory.structured_memory
    2) conversation summaries as-is
    3) only semantically similar RAG snippets (not entire embeddings table)
    """
    if not db or not user_identity or not _is_valid_uuid(user_identity):
        return ""

    try:
        sections: list[str] = []
        structured_obj: dict | None = None

        mem_res = (
            db.table("user_memory")
            .select("structured_memory")
            .eq("user_id", user_identity)
            .limit(1)
            .execute()
        )
        if mem_res.data and len(mem_res.data) > 0:
            structured = mem_res.data[0].get("structured_memory")
            if structured:
                if isinstance(structured, dict):
                    structured_obj = structured
                sections.append(f"Overarching User Memory Profile:\n{structured}")

        conv_res = (
            db.table("conversations")
            .select("summary, updated_at")
            .eq("user_id", user_identity)
            .not_.is_("summary", "null")
            .order("updated_at", desc=True)
            .limit(12)
            .execute()
        )
        conv_summaries = []
        if conv_res.data:
            for row in conv_res.data:
                s = str(row.get("summary", "")).strip()
                if s:
                    conv_summaries.append(s)
        if conv_summaries:
            sections.append(
                "Conversation Memory (summaries):\n"
                + "\n---\n".join(conv_summaries)
            )

        # Build focused semantic query seed from key fields (not full blob) for better matches.
        query_seed_parts: list[str] = []
        if structured_obj:
            for key in ("keywords", "recent_events", "core_issues", "preferences"):
                vals = structured_obj.get(key)
                if isinstance(vals, list) and vals:
                    joined_vals = ", ".join(str(v).strip() for v in vals if str(v).strip())
                    if joined_vals:
                        query_seed_parts.append(f"{key}: {joined_vals}")
        if conv_summaries:
            query_seed_parts.append(f"latest_summary: {conv_summaries[0]}")

        query_seed = "\n".join(query_seed_parts).strip()[:1200]
        query_embedding = _get_embedding_values(query_seed)
        similar_chunks: list[str] = []
        if query_embedding:
            rpc_res = db.rpc(
                "match_messages",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.2,
                    "match_count": 12,
                    "p_user_id": user_identity,
                },
            ).execute()
            if rpc_res.data:
                for row in rpc_res.data:
                    t = str(row.get("content", "")).strip()
                    if t and t not in similar_chunks:
                        similar_chunks.append(t)
        else:
            logger.warning("Voice memory: similarity query seed empty or embedding failed")

        # Fallback: include a few most-recent semantic chunks if similarity returns nothing.
        if not similar_chunks:
            recent_res = (
                db.table("message_embeddings")
                .select("content, created_at")
                .eq("user_id", user_identity)
                .order("created_at", desc=True)
                .limit(6)
                .execute()
            )
            if recent_res.data:
                for row in recent_res.data:
                    t = str(row.get("content", "")).strip()
                    if t and t not in similar_chunks:
                        similar_chunks.append(t)

        if similar_chunks:
            sections.append(
                "Relevant Semantic Memories (similar matches):\n"
                + "\n---\n".join(similar_chunks)
            )

        memory_context = "\n\n".join(sections)
        logger.info(
            "Voice memory loaded for user=%s (sections=%d, chars=%d)",
            user_identity,
            len(sections),
            len(memory_context),
        )
        return memory_context
    except Exception as exc:
        logger.error("Failed loading voice memory context: %s", exc)
        return ""


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
    logger.info("Connected to room: %s", ctx.room.name)

    # Identify the human participant (for DB user_id linkage).
    user_identity: str | None = None
    for p in ctx.room.remote_participants.values():
        ident = getattr(p, "identity", None) or ""
        if ident and not ident.startswith("nova"):
            user_identity = ident
            break

    memory_context = _load_full_voice_memory(user_identity)

    chat_ctx = ChatContext()
    agent = NovaTherapistAgent(chat_ctx=chat_ctx, memory_context=memory_context)

    session = AgentSession(
        stt=deepgram.STT(),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=elevenlabs.TTS(voice_id=ELEVENLABS_VOICE_ID),
        vad=silero.VAD.load(),
        userdata={},
    )

    async def on_shutdown():
        transcript = _extract_transcript(session)
        await _persist_transcript(transcript, ctx.room.name, user_identity)

    ctx.add_shutdown_callback(on_shutdown)

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(),
    )

    try:
        # Deterministic startup line: no LLM dependency for the first greeting.
        await session.say("Hi, I'm Nova. How can I help you today?")
    except RuntimeError as exc:
        logger.warning("Skipping initial greeting: %s", exc)
    logger.info("Nova therapist agent is running in room %s", ctx.room.name)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(server)
