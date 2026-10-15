-- Clube NPV — base Supabase (fase 2).
-- APLICAR APENAS em projeto Supabase aprovado, com backup e revisão da configuração.
-- O protótipo /clube não se conecta a este banco: usa dados fictícios locais.
-- Este esquema prioriza isolamento por aluno e lançamentos efetuados apenas por administradores.

create extension if not exists pgcrypto;

create table if not exists public.clube_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clube_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.clube_point_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id) on delete restrict,
  event_type text not null check(event_type in ('renovacao','indicacao','foto','desafio','aniversario','ajuste','resgate')),
  points integer not null check(points <> 0 and points between -100000 and 100000),
  note text not null default '',
  reference_id text,
  performed_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint clube_point_events_note_for_adjustment check(event_type <> 'ajuste' or length(trim(note)) > 0)
);
create index if not exists clube_events_student_date on public.clube_point_events (student_id, created_at desc);
create index if not exists clube_events_date on public.clube_point_events (created_at desc);
create unique index if not exists clube_events_unique_external_ref
  on public.clube_point_events(reference_id) where reference_id is not null;

-- Função no servidor, nunca no navegador, para consultar permissões administrativas.
create or replace function public.clube_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.clube_admins ca where ca.user_id = (select auth.uid())
  );
$$;
revoke all on function public.clube_is_admin() from public;
grant execute on function public.clube_is_admin() to authenticated;

-- Novo usuário autenticado recebe apenas o perfil básico, NUNCA permissão admin.
create or replace function public.clube_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.clube_profiles(id,full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_clube_new_auth_user on auth.users;
create trigger trg_clube_new_auth_user
  after insert on auth.users
  for each row execute function public.clube_new_auth_user();

alter table public.clube_profiles enable row level security;
alter table public.clube_admins enable row level security;
alter table public.clube_point_events enable row level security;

-- Perfis: cada aluno só vê seu registro; admin pode consultar todos.
create policy "clube_profiles_select" on public.clube_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.clube_is_admin()));

create policy "clube_profiles_insert_admin" on public.clube_profiles
  for insert to authenticated
  with check ((select public.clube_is_admin()));

create policy "clube_profiles_update_admin" on public.clube_profiles
  for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));

-- Tabela de administradores: nenhum acesso de escrita ao navegador.
create policy "clube_admins_own_role" on public.clube_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.clube_admins from anon, authenticated;

-- Extrato: aluno consulta apenas suas movimentações; admin consulta todas.
create policy "clube_points_select" on public.clube_point_events
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.clube_is_admin()));

-- Somente administradores autenticados lançam pontos, registrando a autoria real.
create policy "clube_points_insert_admin" on public.clube_point_events
  for insert to authenticated
  with check ((select public.clube_is_admin()) and performed_by = (select auth.uid()));

-- Extrato é imutável; correções são feitas por lançamento compensatório.
revoke update, delete on public.clube_point_events from anon, authenticated;

-- IMPORTANTE: se uma política antiga existir, revise antes de executar este script,
-- que pressupõe projeto Supabase novo. Não armazenar senha em tabelas próprias.
-- Criar primeira conta pela autenticação Supabase e, NO SQL EDITOR (somente proprietário),
-- conceder admin manualmente:
--
-- insert into public.clube_admins(user_id)
-- select id from auth.users where email = 'SEU_EMAIL_ADMIN_CONFIRMADO';
--
-- Nunca expor service_role key no site. O frontend usa somente a chave publicável,
-- e as regras RLS precisam ser testadas antes de cadastrar alunos reais.
-- Para renovar automaticamente: webhooks Hotmart devem ser validados em servidor,
-- com referência externa única para impedir duplicação; não no frontend.
