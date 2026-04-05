-- Per-conversation buffer: batch several user lines into one message_embeddings row.
alter table public.conversations add column if not exists memory_rag_buffer text not null default '';

alter table public.conversations add column if not exists memory_rag_buffer_msgs integer not null default 0;

comment on column public.conversations.memory_rag_buffer is 'Pending user text not yet embedded for RAG; flushed as one vector when chunk thresholds are met.';

alter table public.message_embeddings add column if not exists source_message_count integer not null default 1;

comment on column public.message_embeddings.content is 'Semantic chunk: may combine multiple user messages separated by blank lines.';
