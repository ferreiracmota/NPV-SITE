-- NPV | Strava: creditos automaticos auditaveis e idempotentes, somente pelo backend.
-- A tabela guarda somente total mensal agregado; nenhuma atividade ou token Strava e persistido.
create table if not exists public.clube_strava_monthly_progress (
  student_id uuid not null references public.clube_profiles(id) on delete cascade,
  month_key text not null check (month_key ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  highest_eligible_meters bigint not null default 0 check (highest_eligible_meters >= 0),
  credited_km_points integer not null default 0 check (credited_km_points between 0 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id,month_key)
);
alter table public.clube_strava_monthly_progress enable row level security;
revoke all on public.clube_strava_monthly_progress from public, anon, authenticated;
grant select,insert,update on public.clube_strava_monthly_progress to service_role;

-- A funcao aplica um delta monetario de pontos sob lock: repetir ou executar em paralelo
-- nao duplica credito. Apenas a role de servico pode executa-la, nunca o navegador.
create or replace function public.clube_sync_strava_month(
  p_student_id uuid,
  p_month_key text,
  p_eligible_meters bigint
) returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_rate numeric;
  v_total integer;
  v_already integer;
  v_delta integer := 0;
  v_km_limit integer := 200;
  v_challenges integer := 0;
  v_challenge record;
  v_inserted integer;
  v_current_month text := to_char(timezone('America/Sao_Paulo',now()),'YYYY-MM');
begin
  if p_student_id is null or p_month_key is null or p_month_key <> v_current_month
     or p_month_key !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
     or p_eligible_meters is null or p_eligible_meters < 0
     or p_eligible_meters > 10000000 then
    raise exception 'Invalid monthly Strava summary';
  end if;
  perform 1 from public.clube_profiles where id=p_student_id and approved=true;
  if not found then
    return jsonb_build_object('status','not_eligible','credited_now',0,'challenge_credited_now',0);
  end if;
  select points_per_km into v_rate
    from public.clube_km_settings where singleton=true;
  if v_rate is null or v_rate < 0 or v_rate > 10000 then
    raise exception 'Missing/invalid kilometer rate';
  end if;
  insert into public.clube_strava_monthly_progress(student_id,month_key)
    values(p_student_id,p_month_key) on conflict do nothing;
  select credited_km_points into v_already
    from public.clube_strava_monthly_progress
    where student_id=p_student_id and month_key=p_month_key for update;

  v_total := least(v_km_limit,floor((p_eligible_meters::numeric/1000)*v_rate)::integer);
  v_delta := greatest(0,v_total-v_already);
  if v_delta>0 then
    insert into public.clube_point_events
      (student_id,event_type,points,note,reference_id,performed_by,is_test)
    values
      (p_student_id,'extra_11111111111111111111111111111111',v_delta,
       'Strava: corrida, caminhada e bicicleta; acumulado de '||
       trim(to_char(p_eligible_meters::numeric/1000,'FM9999990.00'))||' km em '||p_month_key||
       '; teto de '||v_km_limit||' pts/mes.',
       'strava:km:'||p_student_id::text||':'||p_month_key||':'||v_total::text,
       p_student_id,false);
  end if;

  update public.clube_strava_monthly_progress
     set credited_km_points=greatest(credited_km_points,v_total),
         highest_eligible_meters=greatest(highest_eligible_meters,p_eligible_meters),
         updated_at=now()
   where student_id=p_student_id and month_key=p_month_key;

  for v_challenge in
    select id,name,goal_km,reward_points from public.clube_monthly_challenges
     where month_key=p_month_key and active=true and goal_km>0
       and reward_points between 1 and 100000
    order by position,id
  loop
    if p_eligible_meters::numeric >= v_challenge.goal_km*1000 then
      insert into public.clube_point_events
        (student_id,event_type,points,note,reference_id,performed_by,is_test)
      values
        (p_student_id,'desafio',v_challenge.reward_points,
         'Strava: meta mensal "'||left(v_challenge.name,80)||'" de '||
         trim(to_char(v_challenge.goal_km,'FM9999990.##'))||' km concluida em '||p_month_key||'.',
         'strava:challenge:'||p_student_id::text||':'||v_challenge.id::text,
         p_student_id,false)
      on conflict (reference_id) do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted>0 then v_challenges:=v_challenges+v_challenge.reward_points; end if;
    end if;
  end loop;
  return jsonb_build_object(
    'status','ok','credited_now',v_delta,'challenge_credited_now',v_challenges,
    'month_credited_km_points',greatest(v_already,v_total),
    'month_key',p_month_key);
end;
$function$;
revoke all on function public.clube_sync_strava_month(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.clube_sync_strava_month(uuid,text,bigint) to service_role;
