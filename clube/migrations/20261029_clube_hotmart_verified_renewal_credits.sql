-- Conciliação automática e idempotente de renovações Hotmart verificadas.
-- A função só é chamável pelo backend (service_role), nunca pelo aluno.
create or replace function public.clube_reconcile_hotmart_renewals(
  p_student_id uuid,
  p_admin_id uuid,
  p_target_points integer,
  p_reference text,
  p_note text
) returns text
language plpgsql security definer set search_path=''
as $function$
declare
  v_existing integer;
  v_difference integer;
begin
  if p_student_id is null or p_admin_id is null
    or p_target_points is null or p_target_points < 1 or p_target_points > 100000
    or p_reference is null or length(p_reference) not between 20 and 180
    or p_reference not like 'hotmart:renewal-sync:v1:%'
    or p_note is null or length(p_note) not between 10 and 400
  then return 'invalid_request'; end if;

  if not exists(select 1 from public.clube_admins where user_id=p_admin_id)
  then return 'invalid_admin'; end if;
  -- Bloqueio por aluno evita dois crons concorrentes creditarem duas vezes.
  perform 1
  from public.clube_profiles p join auth.users u on u.id=p.id
  where p.id=p_student_id and p.approved=true
    and lower(p.email)=lower(u.email)
    and u.email_confirmed_at is not null
  for update of p;
  if not found then return 'unverified_student'; end if;
  select coalesce(sum(points),0)::integer into v_existing
  from public.clube_point_events
  where student_id=p_student_id and event_type='renovacao' and is_test=false;

  if v_existing<0 then return 'needs_review'; end if;
  v_difference:=p_target_points-v_existing;
  if v_difference<=0 then return 'already_current'; end if;
  if v_difference>100000 then return 'needs_review'; end if;

  insert into public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by,is_test)
  values(p_student_id,'renovacao',v_difference,p_note,p_reference,p_admin_id,false)
  on conflict(reference_id) do nothing;
  if not found then return 'already_current'; end if;
  return 'credited';
end;
$function$;
revoke all on function public.clube_reconcile_hotmart_renewals(uuid,uuid,integer,text,text)
  from public,anon,authenticated;
grant execute on function public.clube_reconcile_hotmart_renewals(uuid,uuid,integer,text,text)
  to service_role;
