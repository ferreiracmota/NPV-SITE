-- NPV | Evolução de cargas, isolada de pontos, recompensas, Hotmart e Strava.
-- Catálogo somente leitura para alunas. Histórico privado protegido por RLS.
create table if not exists public.clube_training_exercises (
  slug text primary key check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  display_order integer not null default 100,
  active boolean not null default true
);

insert into public.clube_training_exercises (slug,name,display_order,active)
values
  ('agachamento-livre','Agachamento livre',10,true),
  ('agachamento-smith','Agachamento Smith',20,true),
  ('leg-press','Leg press',30,true),
  ('cadeira-extensora','Cadeira extensora',40,true),
  ('stiff','Stiff',50,true),
  ('mesa-flexora','Mesa flexora',60,true),
  ('cadeira-flexora','Cadeira flexora',70,true),
  ('afundo','Afundo',80,true)
on conflict (slug) do nothing;

create table if not exists public.clube_training_load_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  exercise_slug text not null references public.clube_training_exercises(slug),
  recorded_on date not null default (timezone('America/Sao_Paulo',now())::date),
  load_kg numeric(6,2) not null check (load_kg>=0 and load_kg<=500),
  repetitions smallint check (repetitions between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clube_training_one_load_per_day unique(student_id,exercise_slug,recorded_on),
  constraint clube_training_not_future check(recorded_on<=timezone('America/Sao_Paulo',now())::date)
);
create index if not exists clube_training_load_entries_student_history
  on public.clube_training_load_entries(student_id,exercise_slug,recorded_on desc);

alter table public.clube_training_exercises enable row level security;
alter table public.clube_training_load_entries enable row level security;

drop policy if exists clube_training_exercises_student_read on public.clube_training_exercises;
create policy clube_training_exercises_student_read
  on public.clube_training_exercises for select to authenticated
  using ((select public.clube_member_approved()));

drop policy if exists clube_training_load_owner_read on public.clube_training_load_entries;
create policy clube_training_load_owner_read
  on public.clube_training_load_entries for select to authenticated
  using(student_id=(select auth.uid()) and (select public.clube_member_approved()));

drop policy if exists clube_training_load_owner_insert on public.clube_training_load_entries;
create policy clube_training_load_owner_insert
  on public.clube_training_load_entries for insert to authenticated
  with check(student_id=(select auth.uid()) and (select public.clube_member_approved()));

drop policy if exists clube_training_load_owner_update on public.clube_training_load_entries;
create policy clube_training_load_owner_update
  on public.clube_training_load_entries for update to authenticated
  using(student_id=(select auth.uid()) and (select public.clube_member_approved()))
  with check(student_id=(select auth.uid()) and (select public.clube_member_approved()));

drop policy if exists clube_training_load_owner_delete on public.clube_training_load_entries;
create policy clube_training_load_owner_delete
  on public.clube_training_load_entries for delete to authenticated
  using(student_id=(select auth.uid()) and (select public.clube_member_approved()));

revoke all on public.clube_training_exercises from public,anon,authenticated;
revoke all on public.clube_training_load_entries from public,anon,authenticated;
grant select on public.clube_training_exercises to authenticated;
grant select,insert,update,delete on public.clube_training_load_entries to authenticated;
