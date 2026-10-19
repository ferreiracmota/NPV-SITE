-- Clube NPV: vários desafios nomeados por mês, sem perder a meta já cadastrada.
-- O desafio original recebe um ID permanente; a linha de outubro e suas configurações são preservadas.
alter table public.clube_monthly_challenges
  add column if not exists id uuid default gen_random_uuid();
update public.clube_monthly_challenges set id = gen_random_uuid() where id is null;
alter table public.clube_monthly_challenges alter column id set not null;
alter table public.clube_monthly_challenges
  add column if not exists name text not null default 'Desafio do mês';
alter table public.clube_monthly_challenges
  add column if not exists position integer not null default 0;
alter table public.clube_monthly_challenges
  drop constraint if exists clube_monthly_challenges_pkey;
alter table public.clube_monthly_challenges
  add constraint clube_monthly_challenges_pkey primary key (id);
alter table public.clube_monthly_challenges
  drop constraint if exists clube_monthly_challenges_name_valid;
alter table public.clube_monthly_challenges
  add constraint clube_monthly_challenges_name_valid
  check (length(btrim(name)) between 2 and 75 and name = btrim(name));
alter table public.clube_monthly_challenges
  drop constraint if exists clube_monthly_challenges_position_valid;
alter table public.clube_monthly_challenges
  add constraint clube_monthly_challenges_position_valid
  check (position between 0 and 1000);
create unique index if not exists clube_monthly_challenges_month_name_unique
  on public.clube_monthly_challenges (month_key, lower(name));
create index if not exists clube_monthly_challenges_month_order
  on public.clube_monthly_challenges (month_key, position, id);
-- As políticas RLS existentes restringem INSERT/UPDATE ao administrador.
-- O papel autenticado não ganha direito de escrita por ser apenas aluno.
grant select, insert, update on public.clube_monthly_challenges to authenticated;
revoke all on public.clube_monthly_challenges from anon;
comment on table public.clube_monthly_challenges is
  'Desafios mensais nomeados e independentes, administrados via RLS; progresso só consultado no Strava, sem crédito automático de pontos.';
