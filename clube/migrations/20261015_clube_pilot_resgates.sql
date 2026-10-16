-- Migration já aplicada no Supabase (15/10/2026); manter para histórico.
-- Os produtos não são ativados automaticamente por esta migração.
ALTER TABLE public.clube_rewards ADD COLUMN IF NOT EXISTS test_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.clube_redemptions ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.clube_point_events ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.clube_pilot_testers (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clube_pilot_testers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clube_pilot_testers FROM anon,authenticated;
GRANT SELECT ON public.clube_pilot_testers TO authenticated;
DROP POLICY IF EXISTS "clube_pilot_testers_read_self" ON public.clube_pilot_testers;
CREATE POLICY "clube_pilot_testers_read_self" ON public.clube_pilot_testers
FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

INSERT INTO public.clube_pilot_testers(user_id)
SELECT u.id FROM auth.users u JOIN public.clube_profiles p ON p.id=u.id
WHERE lower(u.email)='naopensevai@gmail.com' AND p.approved
ON CONFLICT(user_id) DO NOTHING;

create or replace function public.clube_request_redemption(p_reward_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_student uuid := (select auth.uid());
  v_reward public.clube_rewards%rowtype;
  v_balance integer;
  v_pending integer;
  v_result uuid;
begin
  if v_student is null or not public.clube_member_approved() then
    raise exception 'Aluno não autorizado';
  end if;
  perform 1 from public.clube_profiles where id=v_student and approved for update;
  if not found then raise exception 'Cadastro não aprovado'; end if;
  select * into v_reward from public.clube_rewards where id=p_reward_id for update;
  if not found or not v_reward.active or v_reward.stock < 1 then
    raise exception 'Prêmio indisponível';
  end if;
  if v_reward.test_only and not exists (select 1 from public.clube_pilot_testers where user_id=v_student) then
    raise exception 'Prêmio disponível somente em teste interno';
  end if;
  if exists (
    select 1 from public.clube_redemptions
    where student_id=v_student and reward_id=p_reward_id and status='pending'
  ) then raise exception 'Já existe um pedido pendente para este item'; end if;
  select coalesce(sum(points),0) into v_balance
    from public.clube_point_events
   where student_id=v_student and created_at>=date_trunc('year',now());
  select coalesce(sum(points),0) into v_pending
    from public.clube_redemptions
   where student_id=v_student and status='pending';
  if v_balance-v_pending<v_reward.points then raise exception 'Pontos insuficientes'; end if;
  insert into public.clube_redemptions(student_id,reward_id,reward_name,points,is_test)
    values(v_student,v_reward.id,v_reward.name,v_reward.points,v_reward.test_only)
    returning id into v_result;
  return v_result;
end;
$$;
REVOKE ALL ON FUNCTION public.clube_request_redemption(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clube_request_redemption(uuid) TO authenticated;

create or replace function public.clube_resolve_redemption(p_id uuid,p_approve boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.clube_redemptions%rowtype;
  v_reward public.clube_rewards%rowtype;
  v_balance integer;
  v_pending integer;
  v_operator uuid := (select auth.uid());
begin
  if not public.clube_is_admin() then raise exception 'Permissão negada'; end if;
  -- Primeiro bloqueamos o aluno, depois o item e o pedido: a mesma
  -- ordem das solicitações, evitando descontos simultâneos.
  select * into v_row from public.clube_redemptions where id=p_id;
  if not found then raise exception 'Solicitação inexistente'; end if;
  perform 1 from public.clube_profiles where id=v_row.student_id for update;
  select * into v_reward from public.clube_rewards where id=v_row.reward_id for update;
  select * into v_row from public.clube_redemptions where id=p_id for update;
  if v_row.status <> 'pending' then raise exception 'Solicitação já finalizada'; end if;
  if p_approve then
    if v_reward.stock < 1 then raise exception 'Estoque insuficiente'; end if;
    select coalesce(sum(points),0) into v_balance from public.clube_point_events
      where student_id=v_row.student_id and created_at>=date_trunc('year',now());
    select coalesce(sum(points),0) into v_pending from public.clube_redemptions
      where student_id=v_row.student_id and status='pending';
    if v_balance < v_pending then raise exception 'Saldo insuficiente'; end if;
    update public.clube_rewards set stock=stock-1 where id=v_reward.id;
    insert into public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by,is_test)
      values(v_row.student_id,'resgate',-v_row.points,
             (case when v_row.is_test then '[TESTE - sem entrega] ' else '' end)||'Resgate aprovado: '||v_row.reward_name,
             'clube-resgate:'||v_row.id::text,v_operator,v_row.is_test);
  end if;
  update public.clube_redemptions
     set status=case when p_approve then 'approved' else 'rejected' end,
         resolved_at=now(),resolved_by=v_operator
   where id=p_id;
end;
$$;
REVOKE ALL ON FUNCTION public.clube_resolve_redemption(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clube_resolve_redemption(uuid,boolean) TO authenticated;
