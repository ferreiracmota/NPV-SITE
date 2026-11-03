-- Homologação administrativa temporária de Instagram, separada do ID da Meta.
-- Não grava instagram_scoped_id, não habilita Stories e não altera pontos.
create table if not exists public.clube_instagram_manual_links (
  student_id uuid primary key references public.clube_profiles(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{1,30}$'),
  approved_by uuid not null references public.clube_admins(user_id),
  approved_at timestamptz not null default now(),
  basis text not null default 'admin_attested_direct'
    check (basis = 'admin_attested_direct')
);

comment on table public.clube_instagram_manual_links is
  'Perfil Instagram liberado manualmente pelo operador. Não equivale à confirmação técnica da Meta; sem créditos automáticos de Stories.';

alter table public.clube_instagram_manual_links enable row level security;
-- Leitura/gravação somente através de endpoints autenticados com service_role.
revoke all on public.clube_instagram_manual_links from public, anon, authenticated;
grant select, insert, update, delete on public.clube_instagram_manual_links to service_role;
