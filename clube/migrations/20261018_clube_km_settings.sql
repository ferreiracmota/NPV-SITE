-- Preparação de regras de pontuação NPV por km: sem conexão com fontes externas.
-- Migração aditiva. Nenhum ponto é emitido, nenhum dado de atividade é armazenado.
create table if not exists public.clube_km_settings (
  singleton boolean primary key default true check (singleton),
  points_per_km numeric(8,3) not null default 1 check (points_per_km >= 0 and points_per_km <= 10000),
  eligible_sports text[] not null default array['Run','Walk','Ride']::text[]
    check (cardinality(eligible_sports) between 1 and 3 and eligible_sports <@ array['Run','Walk','Ride']::text[]),
  updated_at timestamptz not null default now()
);
insert into public.clube_km_settings(singleton,points_per_km,eligible_sports)
values (true,1,array['Run','Walk','Ride']::text[])
on conflict (singleton) do nothing;

alter table public.clube_km_settings enable row level security;
revoke all on table public.clube_km_settings from anon;
revoke all on table public.clube_km_settings from authenticated;
grant select,update(points_per_km,eligible_sports,updated_at) on public.clube_km_settings to authenticated;

create policy clube_km_settings_admin_select on public.clube_km_settings
  for select to authenticated
  using ((select public.clube_is_admin()));

create policy clube_km_settings_admin_update on public.clube_km_settings
  for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));

comment on table public.clube_km_settings is
  'Regras independentes de pontuacao NPV por km. Sem tokens, atividades, automatizacao ou creditos Strava.';
