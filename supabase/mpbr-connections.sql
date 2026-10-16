-- Execute uma vez no SQL Editor do projeto Supabase usado pelo site.
-- Tokens MPBR são criptografados pelo servidor antes de serem gravados.
create table if not exists public.mpbr_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token_ciphertext text not null,
 expires_at timestamptz not null,
 updated_at timestamptz not null default now()
);
alter table public.mpbr_connections enable row level security;
revoke all on public.mpbr_connections from public, anon, authenticated;
grant select, insert, update, delete on public.mpbr_connections to service_role;
