-- Clube NPV: categorias de pontos editáveis, preservando o histórico existente.
-- A identificação event_type nunca muda quando o administrador renomeia o benefício.
alter table public.clube_point_rules add column if not exists label text;
update public.clube_point_rules
set label = case event_type
  when 'renovacao' then 'Renovação confirmada'
  when 'indicacao' then 'Indicação convertida'
  when 'foto' then 'Foto aprovada'
  when 'desafio' then 'Participação em desafio'
  when 'aniversario' then 'Aniversário como assinante'
  else event_type end
where label is null;
alter table public.clube_point_rules alter column label set not null;
alter table public.clube_point_rules drop constraint if exists clube_point_rules_label_valid;
alter table public.clube_point_rules add constraint clube_point_rules_label_valid
  check (length(btrim(label)) between 2 and 75 and label = btrim(label));
alter table public.clube_point_rules drop constraint if exists clube_point_rules_event_type_check;
alter table public.clube_point_rules add constraint clube_point_rules_event_type_check
  check (event_type in ('renovacao','indicacao','foto','desafio','aniversario')
    or event_type ~ '^extra_[0-9a-f]{32}$');
alter table public.clube_point_events drop constraint if exists clube_point_events_event_type_check;
alter table public.clube_point_events add constraint clube_point_events_event_type_check
  check (event_type in ('renovacao','indicacao','foto','desafio','aniversario','ajuste','resgate')
    or event_type ~ '^extra_[0-9a-f]{32}$');

-- Atualização de todas as regras em uma transação; acesso somente para administradores.
create or replace function public.clube_save_point_rules(p_rules jsonb)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  v_rule jsonb;
  v_key text;
  v_label text;
  v_points_text text;
  v_position_text text;
  v_points integer;
  v_position integer;
  v_total integer;
  v_changed integer := 0;
begin
  if not public.clube_is_admin() then raise exception 'Permissão negada'; end if;
  if p_rules is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Formato de regras inválido';
  end if;
  v_total := jsonb_array_length(p_rules);
  if v_total < 5 or v_total > 50 then
    raise exception 'Informe de 5 a 50 categorias de pontos';
  end if;
  if (select count(distinct r->>'event_type') from jsonb_array_elements(p_rules) r) <> v_total then
    raise exception 'Não repita categorias de pontos';
  end if;
  if exists (
    select 1 from public.clube_point_rules r
    where not exists (
      select 1 from jsonb_array_elements(p_rules) e
      where e->>'event_type' = r.event_type
    )
  ) then
    raise exception 'Nenhuma categoria cadastrada pode ser removida';
  end if;

  for v_rule in select value from jsonb_array_elements(p_rules)
  loop
    if jsonb_typeof(v_rule) <> 'object' then raise exception 'Regra inválida'; end if;
    v_key := v_rule->>'event_type';
    v_label := btrim(coalesce(v_rule->>'label',''));
    v_points_text := v_rule->>'points';
    v_position_text := v_rule->>'position';
    if v_key is null or
       (v_key not in ('renovacao','indicacao','foto','desafio','aniversario')
        and v_key !~ '^extra_[0-9a-f]{32}$') then
      raise exception 'Código de atividade inválido';
    end if;
    if length(v_label) < 2 or length(v_label) > 75
       or v_label <> coalesce(v_rule->>'label','') then
      raise exception 'O nome do benefício deve ter de 2 a 75 caracteres, sem espaços nas pontas';
    end if;
    if v_points_text is null or v_points_text !~ '^[0-9]{1,6}$' then
      raise exception 'Pontuação inválida';
    end if;
    v_points := v_points_text::integer;
    if v_points > 100000 then raise exception 'Pontuação máxima de 100.000'; end if;
    if v_position_text is null or v_position_text !~ '^[0-9]{1,4}$' then
      raise exception 'Ordem inválida';
    end if;
    v_position := v_position_text::integer;
    if v_position > 1000 then raise exception 'Ordem fora do limite'; end if;
    insert into public.clube_point_rules(event_type,label,points,position,updated_at)
      values(v_key,v_label,v_points,v_position,now())
      on conflict(event_type) do update
        set label=excluded.label, points=excluded.points,
            position=excluded.position, updated_at=excluded.updated_at;
    v_changed := v_changed + 1;
  end loop;
  if exists (
    select 1 from public.clube_point_rules
    group by lower(label) having count(*) > 1
  ) then raise exception 'Não pode haver dois benefícios com o mesmo nome'; end if;
  if v_changed <> v_total then raise exception 'Quantidade de regras inconsistente'; end if;
end
$fn$;

-- Autoriza novos tipos apenas se realmente cadastrados e protegidos por administrador.
create or replace function public.clube_award_points(
  p_student_id uuid, p_type text, p_points integer, p_note text default '')
returns uuid language plpgsql security definer set search_path = ''
as $fn$
declare
  v_result uuid;
  v_current integer;
  v_held integer;
  v_year timestamptz := date_trunc('year',now());
begin
  if not public.clube_is_admin() then raise exception 'Permissão negada'; end if;
  if p_type is null or (p_type <> 'ajuste' and not exists
      (select 1 from public.clube_point_rules where event_type=p_type))
     or p_points is null or p_points=0 or p_points>100000 or p_points< -100000 then
    raise exception 'Atividade ou pontuação inválida';
  end if;
  if p_type <> 'ajuste' and p_points < 0 then
    raise exception 'Descontos manuais devem usar Ajuste';
  end if;
  if p_type='ajuste' and length(btrim(coalesce(p_note,'')))=0 then
    raise exception 'Informe a justificativa do ajuste';
  end if;
  perform 1 from public.clube_profiles where id=p_student_id and approved for update;
  if not found then raise exception 'Aluno ainda não aprovado ou inexistente'; end if;
  select coalesce(sum(points),0) into v_current
    from public.clube_point_events
   where student_id=p_student_id and created_at>=v_year;
  select coalesce(sum(points),0) into v_held
    from public.clube_redemptions
   where student_id=p_student_id and status='pending';
  if v_current+p_points-v_held < 0 then raise exception 'Saldo disponível insuficiente'; end if;
  insert into public.clube_point_events(student_id,event_type,points,note,performed_by)
    values(p_student_id,p_type,p_points,coalesce(p_note,''),(select auth.uid()))
    returning id into v_result;
  return v_result;
end
$fn$;
revoke all on function public.clube_save_point_rules(jsonb) from public,anon,authenticated;
grant execute on function public.clube_save_point_rules(jsonb) to authenticated;
revoke all on function public.clube_award_points(uuid,text,integer,text) from public,anon;
grant execute on function public.clube_award_points(uuid,text,integer,text) to authenticated;
comment on function public.clube_save_point_rules(jsonb) is
  'Gerencia nomes e novas categorias de pontos, com transação atômica e privilégio administrativo.';