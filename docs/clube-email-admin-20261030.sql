-- Executada no Supabase em 30/10/2026: clube_admin_email_templates_20261030
-- Somente serviço autenticado no backend lê e edita; sem policies de acesso público.
create table if not exists public.clube_email_templates (
 key text primary key check (key in ('reward_unlocked','new_reward','challenge_completed','birthday','renewal','referral')),
 name text not null check (char_length(name) between 3 and 80),
 enabled boolean not null default false,
 subject text not null check (char_length(subject) between 3 and 180),
 headline text not null check (char_length(headline) between 3 and 160),
 body text not null check (char_length(body) between 3 and 2000),
 button_label text not null check (char_length(button_label) between 2 and 60),
 active_since timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.clube_email_templates enable row level security;
revoke all on public.clube_email_templates from anon, authenticated;
-- As duas notificações existentes foram preservadas e inicializadas com o
-- catalog_since existente; não alterar esse marco em deploys futuros.
alter table public.clube_email_dispatches alter column reward_id drop not null;
alter table public.clube_email_dispatches drop constraint if exists clube_email_dispatches_kind_check;
alter table public.clube_email_dispatches add constraint clube_email_dispatches_kind_check check
 (kind in ('reward_unlocked','new_reward','challenge_completed','birthday','renewal','referral'));
