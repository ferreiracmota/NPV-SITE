-- Instagram profissional oficial: token OAuth cifrado, somente backend.
-- Aditivo, não altera pontos ou dados de alunos.
create table if not exists public.clube_instagram_business_auth (
  slot text primary key default 'official' check (slot='official'),
  instagram_user_id text not null check (instagram_user_id ~ '^[0-9]{5,40}$'),
  username text not null check (username ~ '^[a-zA-Z0-9._]{2,30}$'),
  token_ciphertext text not null,
  connected_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.clube_instagram_business_auth enable row level security;
revoke all on public.clube_instagram_business_auth from public, anon, authenticated;
grant select, insert, update, delete on public.clube_instagram_business_auth to service_role;
create policy clube_instagram_business_auth_deny_clients
  on public.clube_instagram_business_auth for all to anon, authenticated
  using (false) with check (false);
