-- Make messages the main table with a unique message id.
-- conversations.message_id points to messages.id and conversations keeps summary.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

ALTER TABLE public.messages
ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

-- Keep one transcript row per conversation unless you intentionally change this later.
CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_id_key
ON public.messages (conversation_id);

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS message_id uuid;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_message_id_fkey;
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_message_id_fkey
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_message_id_key
ON public.conversations (message_id)
WHERE message_id IS NOT NULL;

-- Backfill message_id from existing messages rows.
UPDATE public.conversations c
SET message_id = s.id
FROM (
    SELECT DISTINCT ON (conversation_id) id, conversation_id
    FROM public.messages
    ORDER BY conversation_id, id ASC
) s
WHERE c.id = s.conversation_id
  AND c.message_id IS NULL;

-- Cleanup previous schema attempt (safe no-op if absent).
ALTER TABLE public.conversations DROP COLUMN IF EXISTS transcript_message_id;
DROP INDEX IF EXISTS public.conversations_transcript_message_id_key;
ALTER TABLE public.messages DROP COLUMN IF EXISTS summary;
