-- NPV | Aviso individual e manual de marcação não visível em Stories.
-- Não altera a decisão de moderação nem qualquer saldo/pontuação.
create table if not exists public.clube_instagram_story_notices (
  event_id text primary key references public.clube_instagram_story_events(event_id) on delete cascade,
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  sent_by uuid not null references public.clube_admins(user_id),
  notice_type text not null default 'hidden_mention'
    check (notice_type = 'hidden_mention'),
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create index if not exists clube_ig_story_notices_student_pending_idx
  on public.clube_instagram_story_notices(student_id,sent_at desc)
  where acknowledged_at is null;

alter table public.clube_instagram_story_notices enable row level security;

revoke all on public.clube_instagram_story_notices from anon,authenticated;
grant select on public.clube_instagram_story_notices to authenticated;

drop policy if exists clube_ig_story_notices_owner_or_admin_read
  on public.clube_instagram_story_notices;
create policy clube_ig_story_notices_owner_or_admin_read
  on public.clube_instagram_story_notices
  for select to authenticated
  using (
    student_id=(select auth.uid())
    or (select public.clube_is_admin())
  );

-- Sem políticas de INSERT/UPDATE/DELETE para clientes web.
-- Avisar e confirmar leitura passam por endpoints que verificam a sessão,
-- a conta de destino e a permissão de administrador.
