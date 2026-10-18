-- Meta mensal do Clube NPV: somente configuração e leitura de progresso.
-- Nenhum token, percurso, atividade individual ou crédito de pontos é gravado.
create table if not exists public.clube_monthly_challenges (
  month_key text primary key check (month_key ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  goal_km numeric(8,2) not null check (goal_km > 0 and goal_km <= 10000),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.clube_monthly_challenges enable row level security;
revoke all on public.clube_monthly_challenges from anon;
revoke all on public.clube_monthly_challenges from authenticated;
grant select, insert, update (goal_km, active, updated_at) on public.clube_monthly_challenges to authenticated;

create policy clube_challenge_month_read on public.clube_monthly_challenges
  for select to authenticated using (true);
create policy clube_challenge_month_admin_insert on public.clube_monthly_challenges
  for insert to authenticated with check ((select public.clube_is_admin()));
create policy clube_challenge_month_admin_update on public.clube_monthly_challenges
  for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));
comment on table public.clube_monthly_challenges is
  'Meta de distancia mensal configurada pelo administrador. Progresso calculado em tempo real no Strava; sem dados de atividades armazenados ou pontos creditados.';

-- Recompensa única definida por mês (o crédito automático exige validação independente).
alter table public.clube_monthly_challenges add column if not exists reward_points integer not null default 300 check (reward_points between 1 and 100000);
grant update(reward_points) on public.clube_monthly_challenges to authenticated;
