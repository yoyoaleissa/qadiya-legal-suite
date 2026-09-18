create table if not exists public.app_internal_secret_hashes (
  name text primary key,
  secret_sha256 text not null,
  description text,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.app_internal_secret_hashes to service_role;

alter table public.app_internal_secret_hashes enable row level security;

create or replace function public.touch_app_internal_secret_hashes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_internal_secret_hashes_updated_at on public.app_internal_secret_hashes;
create trigger trg_app_internal_secret_hashes_updated_at
before update on public.app_internal_secret_hashes
for each row
execute function public.touch_app_internal_secret_hashes_updated_at();