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

-- Auditoria mínima de mensagens enviadas na demonstração. Sem conteúdo de DM.
create table if not exists public.clube_instagram_demo_messages (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  meta_message_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists clube_instagram_demo_messages_student_idx
  on public.clube_instagram_demo_messages(student_id,created_at desc);
alter table public.clube_instagram_demo_messages enable row level security;
revoke all on public.clube_instagram_demo_messages from public, anon, authenticated;
grant select,insert on public.clube_instagram_demo_messages to service_role;
create policy clube_instagram_demo_messages_deny_clients
  on public.clube_instagram_demo_messages for all to anon, authenticated
  using (false) with check (false);
