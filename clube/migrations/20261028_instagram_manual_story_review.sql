-- Clube NPV: revisão manual dos Stories. Nenhum crédito ocorre sem decisão
-- explícita de um administrador autenticado pelo backend.
alter table public.clube_instagram_story_events
  add column if not exists reviewed_at timestamptz;
alter table public.clube_instagram_story_events
  add column if not exists reviewed_by uuid references public.clube_admins(user_id);

alter table public.clube_instagram_story_events
  drop constraint if exists clube_instagram_story_events_status_check;
alter table public.clube_instagram_story_events
  add constraint clube_instagram_story_events_status_check
  check (status in ('unlinked','limit_reached','credited','review','disabled','rejected'));

create or replace function public.clube_instagram_review_story(
  p_event_id text,
  p_decision text,
  p_admin_id uuid,
  p_is_test boolean default false
) returns text
language plpgsql security definer set search_path=''
as $function$
declare
  v_event record;
  v_count integer;
  v_points integer;
begin
  if p_event_id is null or length(p_event_id) not between 4 and 320
    or p_decision not in ('approve','reject') or p_admin_id is null
  then return 'invalid_request'; end if;

  if not exists(select 1 from public.clube_admins where user_id=p_admin_id)
  then return 'admin_required'; end if;

  select event_id,student_id,status,story_key,created_at
    into v_event
    from public.clube_instagram_story_events
   where event_id=p_event_id
   for update;
  if not found then return 'not_found'; end if;
  if v_event.status<>'review' then return 'already_reviewed'; end if;

  if p_decision='reject' then
    update public.clube_instagram_story_events
       set status='rejected',points=0,reviewed_at=now(),reviewed_by=p_admin_id
     where event_id=p_event_id;
    return 'rejected';
  end if;

  if v_event.student_id is null then return 'unlinked'; end if;
  -- A notificação precisa possuir um identificador estável de Story/mídia.
  if v_event.story_key not like 'story:%' and v_event.story_key not like 'asset:%'
  then return 'story_unverified'; end if;

  -- Serializa a aprovação de Stories diferentes da mesma aluna.
  perform 1 from public.clube_profiles
    where id=v_event.student_id and approved=true for update;
  if not found then return 'student_unavailable'; end if;

  select points into v_points from public.clube_point_rules
   where event_type='extra_22222222222222222222222222222222';
  if v_points is distinct from 200 then return 'rule_mismatch'; end if;

  select count(*) into v_count from public.clube_instagram_story_events e
   where e.student_id=v_event.student_id and e.status='credited'
     and date_trunc('month',e.created_at at time zone 'America/Sao_Paulo')
       =date_trunc('month',v_event.created_at at time zone 'America/Sao_Paulo');

  if v_count>=5 then
    update public.clube_instagram_story_events
       set status='limit_reached',points=0,reviewed_at=now(),reviewed_by=p_admin_id
     where event_id=p_event_id;
    return 'limit_reached';
  end if;

  insert into public.clube_point_events(
    student_id,event_type,points,note,reference_id,performed_by,is_test
  ) values (
    v_event.student_id,'extra_22222222222222222222222222222222',200,
    'Story validado manualmente pelo administrador do Clube NPV',
    'instagram_story:'||v_event.event_id,p_admin_id,coalesce(p_is_test,false)
  );
  update public.clube_instagram_story_events
     set status='credited',points=200,reviewed_at=now(),reviewed_by=p_admin_id
   where event_id=p_event_id;
  return 'credited';
end;
$function$;

revoke all on function public.clube_instagram_review_story(text,text,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.clube_instagram_review_story(text,text,uuid,boolean)
  to service_role;