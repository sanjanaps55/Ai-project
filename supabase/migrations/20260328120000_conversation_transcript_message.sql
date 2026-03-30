-- One transcript row per chat: conversations point at messages.id via conversations.message_id.
-- Summary remains on conversations.

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_message_id_key
ON public.conversations (message_id)
WHERE message_id IS NOT NULL;

-- Backfill message_id from existing messages rows (pick earliest row per conversation if duplicates exist)
UPDATE public.conversations c
SET message_id = s.id
FROM (
    SELECT DISTINCT ON (conversation_id) id, conversation_id
    FROM public.messages
    ORDER BY conversation_id, id ASC
) s
WHERE c.id = s.conversation_id
  AND c.message_id IS NULL;

-- Cleanup previous schema attempt (safe no-op if absent)
ALTER TABLE public.conversations DROP COLUMN IF EXISTS transcript_message_id;
DROP INDEX IF EXISTS public.conversations_transcript_message_id_key;
ALTER TABLE public.messages DROP COLUMN IF EXISTS summary;
