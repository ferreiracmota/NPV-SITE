-- Clube NPV - Aparência e visibilidade globais do aluno (2026-10-30)
-- Protegido por RLS: leitura para alunos aprovados e administradores;
-- atualização exclusiva para administradores. Não afeta dados nem pontos.
create table if not exists public.clube_display_settings (
  singleton boolean primary key default true check (singleton),
  theme text not null default 'dark' check (theme in ('dark','light')),
  show_journey boolean not null default true,
  show_achievements boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.clube_display_settings enable row level security;
revoke all on public.clube_display_settings from public, anon, authenticated;
grant select, update on public.clube_display_settings to authenticated;
grant all on public.clube_display_settings to service_role;

create policy clube_display_settings_read_members
  on public.clube_display_settings for select to authenticated
  using ((select public.clube_member_approved()) or (select public.clube_is_admin()));
create policy clube_display_settings_admin_update
  on public.clube_display_settings for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));

insert into public.clube_display_settings(singleton,theme,show_journey,show_achievements)
values(true,'dark',true,true)
on conflict (singleton) do nothing;
