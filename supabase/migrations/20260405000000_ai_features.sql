-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. RAG Vector Memory Table
create table if not exists public.message_embeddings (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.conversations(id) on delete cascade,
    user_id uuid, -- For user-scoped querying
    content text not null,
    embedding vector(768), -- Gemini uses 768-dimensional embeddings
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster cosine similarity searches
create index if not exists message_embeddings_embedding_idx on public.message_embeddings using hnsw (embedding vector_cosine_ops);

-- RAG Cosine Similarity Match Function
create or replace function match_messages(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  conversation_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    message_embeddings.id,
    message_embeddings.conversation_id,
    message_embeddings.content,
    1 - (message_embeddings.embedding <=> query_embedding) as similarity
  from message_embeddings
  where message_embeddings.user_id = p_user_id
    and 1 - (message_embeddings.embedding <=> query_embedding) > match_threshold
  order by message_embeddings.embedding <=> query_embedding
  limit match_count;
$$;

-- 2. Emotional Sentiment Tracking Table
create table if not exists public.sentiment_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    conversation_id uuid references public.conversations(id) on delete cascade,
    joy_score int not null check (joy_score >= 0 and joy_score <= 100),
    anxiety_score int not null check (anxiety_score >= 0 and anxiety_score <= 100),
    sadness_score int not null check (sadness_score >= 0 and sadness_score <= 100),
    anger_score int not null check (anger_score >= 0 and anger_score <= 100),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Assuming user context)
alter table public.message_embeddings enable row level security;
create policy "Users can read own embeddings" on public.message_embeddings for select using (auth.uid() = user_id);
create policy "Users can insert own embeddings" on public.message_embeddings for insert with check (auth.uid() = user_id);

alter table public.sentiment_logs enable row level security;
create policy "Users can read own sentiments" on public.sentiment_logs for select using (auth.uid() = user_id);
create policy "Users can insert own sentiments" on public.sentiment_logs for insert with check (auth.uid() = user_id);
