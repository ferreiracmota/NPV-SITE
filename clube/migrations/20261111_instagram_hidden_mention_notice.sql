-- NPV | Aviso educativo de Story com marcacao escondida
-- Os avisos nao creditam nem rejeitam Stories. Somente admin pode disparar via backend.
-- Instala a definicao em projetos novos sem alterar a tabela que ja existe em producao.
create table if not exists public.clube_instagram_story_notices(
  event_id text primary key references public.clube_instagram_story_events(event_id) on delete cascade,
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  sent_by uuid not null references public.clube_admins(user_id),
  notice_type text not null default 'hidden_mention' check(notice_type='hidden_mention'),
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

alter table public.clube_instagram_story_notices enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clube_instagram_story_notices'
      and policyname='clube_ig_story_notices_owner_or_admin_read'
  ) then
    create policy clube_ig_story_notices_owner_or_admin_read
      on public.clube_instagram_story_notices for select to authenticated
      using (student_id=(select auth.uid()) or (select public.clube_is_admin()));
  end if;
end $$;

-- Somente o backend autenticado (service_role) registra e reconhece os avisos.
-- Acesso individual de leitura pode ser usado por interfaces futuras.
grant select on public.clube_instagram_story_notices to authenticated;
revoke insert,update,delete on public.clube_instagram_story_notices from anon,authenticated;

create or replace function public.clube_instagram_notify_hidden_mention(
  p_event_id text,p_admin_id uuid
) returns text
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_story record;
  v_inserted integer;
begin
  if p_event_id is null or char_length(p_event_id) not between 4 and 320
     or p_admin_id is null then
    return 'invalid_request';
  end if;

  if not exists(select 1 from public.clube_admins a where a.user_id=p_admin_id)
  then return 'admin_required'; end if;

  -- O lock impede avisar depois de uma aprovacao ou rejeicao concorrente.
  select e.student_id,e.status into v_story
    from public.clube_instagram_story_events e
    where e.event_id=p_event_id
    for update;
  if not found then return 'not_found'; end if;
  if v_story.status<>'review' then return 'already_reviewed'; end if;
  if v_story.student_id is null then return 'unlinked'; end if;
  if not exists(select 1 from public.clube_profiles p
      where p.id=v_story.student_id and p.approved=true)
  then return 'student_unavailable'; end if;

  insert into public.clube_instagram_story_notices
    (event_id,student_id,sent_by,notice_type)
  values (p_event_id,v_story.student_id,p_admin_id,'hidden_mention')
  on conflict(event_id) do nothing;
  get diagnostics v_inserted=row_count;
  return case when v_inserted=1 then 'notice_sent' else 'already_notified' end;
end;
$function$;

revoke all on function public.clube_instagram_notify_hidden_mention(text,uuid)
  from public,anon,authenticated;
grant execute on function public.clube_instagram_notify_hidden_mention(text,uuid)
  to service_role;
