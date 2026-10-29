-- Preferências de avisos opcionais do Clube NPV. Sem envio ou alteração dos pontos.
create table if not exists public.clube_email_preferences (
  student_id uuid primary key references public.clube_profiles(id) on delete cascade,
  notify_unlocks boolean not null default false,
  notify_new_rewards boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clube_email_preferences enable row level security;
revoke all on public.clube_email_preferences from anon, authenticated;
grant select, insert, update on public.clube_email_preferences to authenticated;
grant all on public.clube_email_preferences to service_role;
drop policy if exists clube_email_preferences_self_select on public.clube_email_preferences;
create policy clube_email_preferences_self_select on public.clube_email_preferences
  for select to authenticated using ((select auth.uid()) = student_id);
drop policy if exists clube_email_preferences_self_insert on public.clube_email_preferences;
create policy clube_email_preferences_self_insert on public.clube_email_preferences
  for insert to authenticated with check ((select auth.uid()) = student_id);
drop policy if exists clube_email_preferences_self_update on public.clube_email_preferences;
create policy clube_email_preferences_self_update on public.clube_email_preferences
  for update to authenticated using ((select auth.uid()) = student_id)
  with check ((select auth.uid()) = student_id);

-- Configuração exclusiva do backend: desligada até revisão dos testes e liberação.
create table if not exists public.clube_email_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  catalog_since timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clube_email_settings enable row level security;
revoke all on public.clube_email_settings from public, anon, authenticated;
grant all on public.clube_email_settings to service_role;
insert into public.clube_email_settings(singleton,enabled)
  values(true,false) on conflict(singleton) do nothing;

-- Livro de tentativas: trava deduplicação ANTES da chamada externa ao Resend.
-- Falhas não são reenviadas automaticamente para evitar duplicação após timeouts.
create table if not exists public.clube_email_dispatches (
  dedupe_key text primary key check (char_length(dedupe_key) between 10 and 150),
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  reward_id uuid not null,
  kind text not null check(kind in ('reward_unlocked','new_reward')),
  status text not null default 'processing' check(status in ('processing','sent','failed')),
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists clube_email_dispatches_student_idx
  on public.clube_email_dispatches(student_id,created_at desc);
alter table public.clube_email_dispatches enable row level security;
revoke all on public.clube_email_dispatches from public, anon, authenticated;
grant all on public.clube_email_dispatches to service_role;
