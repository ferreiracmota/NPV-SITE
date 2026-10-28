-- Atendimento de solicitações Meta para dados originados da integração Instagram.
-- Guarda apenas hash irreversível do identificador Meta e código de consulta.
-- Proibido acesso anon e authenticated. Nenhum registro de pontos é alterado.
create table if not exists public.clube_instagram_data_requests (
  confirmation_code text primary key
    check (confirmation_code ~ '^[a-f0-9]{32}$'),
  subject_digest text not null
    check (subject_digest ~ '^[a-f0-9]{64}$'),
  status text not null default 'processing'
    check (status in ('processing','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.clube_instagram_data_requests enable row level security;
revoke all on public.clube_instagram_data_requests from public, anon, authenticated;
grant select, insert, update on public.clube_instagram_data_requests to service_role;
create policy clube_instagram_data_requests_deny_clients
  on public.clube_instagram_data_requests
  for all to anon, authenticated using (false) with check (false);
