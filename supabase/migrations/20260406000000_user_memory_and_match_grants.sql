-- Structured profile updated by app/api/chat/summary-memory.ts (Gemini → user_memory)
create table if not exists public.user_memory (
    user_id uuid primary key references auth.users (id) on delete cascade,
    structured_memory jsonb not null default '{}'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_memory enable row level security;

drop policy if exists "Users read own memory" on public.user_memory;
create policy "Users read own memory" on public.user_memory
    for select using (auth.uid() = user_id);

drop policy if exists "Users insert own memory" on public.user_memory;
create policy "Users insert own memory" on public.user_memory
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own memory" on public.user_memory;
create policy "Users update own memory" on public.user_memory
    for update using (auth.uid() = user_id);

-- PostgREST needs EXECUTE on match_messages for supabase.rpc(...) with the user JWT
do $$
declare
  stmt text;
begin
  select format(
    'grant execute on function %I.%I(%s) to authenticated',
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid)
  )
    into stmt
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' and p.proname = 'match_messages'
  limit 1;

  if stmt is not null then
    execute stmt;
  end if;
exception
  when undefined_function then null;
  when insufficient_privilege then null;
end $$;
