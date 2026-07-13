create extension if not exists vector;

create table public.legal_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.legal_knowledge to authenticated;
grant all on public.legal_knowledge to service_role;

alter table public.legal_knowledge enable row level security;

create policy "Knowledge manageable by authenticated"
  on public.legal_knowledge for all
  to authenticated using (true) with check (true);

create index legal_knowledge_embedding_idx
  on public.legal_knowledge using hnsw (embedding vector_cosine_ops);

create or replace function public.match_legal_knowledge(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (id uuid, title text, content text, similarity float)
language sql
stable
set search_path = public
as $$
  select lk.id, lk.title, lk.content,
    1 - (lk.embedding <=> query_embedding) as similarity
  from public.legal_knowledge lk
  where lk.embedding is not null
  order by lk.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_legal_knowledge(vector, int) to authenticated, service_role;

insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users
on conflict (user_id, role) do nothing;