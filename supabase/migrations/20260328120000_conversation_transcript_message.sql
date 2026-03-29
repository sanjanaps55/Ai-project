-- One transcript row per chat: conversations point at messages.id; summary lives on messages.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS summary text;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS transcript_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_transcript_message_id_key
ON public.conversations (transcript_message_id)
WHERE transcript_message_id IS NOT NULL;

-- Point each conversation at its transcript row (pick earliest row per conversation if duplicates exist)
UPDATE public.conversations c
SET transcript_message_id = s.id
FROM (
    SELECT DISTINCT ON (conversation_id) id, conversation_id
    FROM public.messages
    ORDER BY conversation_id, id ASC
) s
WHERE c.id = s.conversation_id
  AND c.transcript_message_id IS NULL;

-- Move existing summary onto the linked messages row
UPDATE public.messages m
SET summary = c.summary
FROM public.conversations c
WHERE c.transcript_message_id = m.id
  AND c.summary IS NOT NULL
  AND c.summary <> '';

-- Single source of truth: summary only on messages
ALTER TABLE public.conversations DROP COLUMN IF EXISTS summary;
