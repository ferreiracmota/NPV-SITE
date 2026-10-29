-- Metadados minimos de conexao Strava do Clube NPV, sem tokens nem atividades.
-- O OAuth continua individual e criptografado no cookie HttpOnly ja existente.
create table if not exists public.clube_strava_connection_status (
  student_id uuid primary key references public.clube_profiles(id) on delete cascade,
  connected boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.clube_strava_connection_status enable row level security;
revoke all on public.clube_strava_connection_status from public, anon, authenticated;
grant select, insert, update, delete on public.clube_strava_connection_status to service_role;
comment on table public.clube_strava_connection_status is
  'Somente status de autorizacao, sem token, dados de atleta ou atividades. Estado antigo sem registro = desconhecido.';
