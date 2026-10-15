-- Clube NPV — banco REAL (Supabase PostgreSQL)
-- NÃO EXECUTE sem conectar projeto Supabase de teste e confirmar o proprietário.
-- Testar RLS com contas distintas antes de permitir dados reais e publicar.
-- Senhas são responsabilidade exclusiva de Supabase Auth; nunca armazenar aqui.
--
-- Ajustes no fluxo:
--   cadastro e-mail/senha -> auth.users -> clube_profiles.is_active=false
--   só o administrador promove membros; só admin registra atividades/pontos
--   pontos por EVENTOS (auditáveis, sem editar/deletar)
--   resgates APENAS por funções SQL transacionais com bloqueio do perfil
--   pontos pendentes ficam reservados e só são debitados quando aprovados

create extension if not exists pgcrypto;

create table if not exists public.clube_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.clube_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.clube_point_rules (
  id text primary key,
  label text not null,
  points integer not null check(points > 0 and points <= 100000),
  is_active boolean not null default true,
  sort_order integer not null default 0
);
insert into public.clube_point_rules(id,label,points,sort_order) values
 ('renovacao','Renovação confirmada',100,1),
 ('indicacao','Indicação convertida',150,2),
 ('foto','Foto publicada e aprovada',30,3),
 ('desafio','Participação em desafio',50,4),
 ('aniversario','Aniversário como assinante',80,5)
on conflict(id) do nothing;

create table if not exists public.clube_point_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id) on delete restrict,
  event_type text not null check(event_type in ('renovacao','indicacao','foto','desafio','aniversario','ajuste','resgate')),
  points integer not null check(points <> 0 and points between -100000 and 100000),
  note text not null default '',
  reference_id text,
  performed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint clube_point_events_note_for_adjustment
    check(event_type <> 'ajuste' or length(trim(note)) > 0)
);
create index if not exists clube_events_student_date
  on public.clube_point_events(student_id,created_at desc);
create unique index if not exists clube_events_unique_external_ref
  on public.clube_point_events(reference_id) where reference_id is not null;

create table if not exists public.clube_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(trim(name)) between 3 and 75),
  category text not null default 'Exclusivo NPV',
  description text not null default '',
  points integer not null check(points > 0 and points <= 100000),
  stock integer not null default 0 check(stock between 0 and 100000),
  icon text not null default 'gift',
  theme text not null default 'lime',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.clube_reward_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id) on delete restrict,
  reward_id uuid not null references public.clube_rewards(id) on delete restrict,
  reward_name text not null,
  points integer not null check(points > 0),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
create index if not exists clube_request_student_status
  on public.clube_reward_requests(student_id,status,created_at desc);
create unique index if not exists clube_only_one_pending_per_reward
  on public.clube_reward_requests(student_id,reward_id) where status='pending';

-- Função de autorização EXECUTADA no banco, não baseada em um campo no browser.
create or replace function public.clube_is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.clube_admins a
                where a.user_id=(select auth.uid()));
$$;
revoke all on function public.clube_is_admin() from public;
grant execute on function public.clube_is_admin() to authenticated;

-- Cadastro automático fica PENDENTE. Um estudante não pode se promover.
create or replace function public.clube_new_auth_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.clube_profiles(id,full_name)
  values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_clube_new_auth_user on auth.users;
create trigger trg_clube_new_auth_user
  after insert on auth.users
  for each row execute function public.clube_new_auth_user();

alter table public.clube_profiles enable row level security;
alter table public.clube_admins enable row level security;
alter table public.clube_point_rules enable row level security;
alter table public.clube_point_events enable row level security;
alter table public.clube_rewards enable row level security;
alter table public.clube_reward_requests enable row level security;

-- Reexecução segura das políticas (schema pensado para projeto dedicado).
drop policy if exists clube_profiles_select on public.clube_profiles;
drop policy if exists clube_profiles_insert_admin on public.clube_profiles;
drop policy if exists clube_profiles_update_admin on public.clube_profiles;
drop policy if exists clube_admins_own_role on public.clube_admins;
drop policy if exists clube_points_select on public.clube_point_events;
drop policy if exists clube_points_insert_admin on public.clube_point_events;
drop policy if exists clube_rules_select on public.clube_point_rules;
drop policy if exists clube_rules_write_admin on public.clube_point_rules;
drop policy if exists clube_rewards_select on public.clube_rewards;
drop policy if exists clube_rewards_insert_admin on public.clube_rewards;
drop policy if exists clube_rewards_update_admin on public.clube_rewards;
drop policy if exists clube_requests_select on public.clube_reward_requests;

create policy clube_profiles_select on public.clube_profiles
  for select to authenticated
  using(id=(select auth.uid()) or (select public.clube_is_admin()));
create policy clube_profiles_update_admin on public.clube_profiles
  for update to authenticated
  using((select public.clube_is_admin()))
  with check((select public.clube_is_admin()));
create policy clube_admins_own_role on public.clube_admins
  for select to authenticated using(user_id=(select auth.uid()));

create policy clube_rules_select on public.clube_point_rules
  for select to authenticated
  using((select public.clube_is_admin()) or
    (is_active and exists(select 1 from public.clube_profiles p
      where p.id=(select auth.uid()) and p.is_active)));
create policy clube_rules_write_admin on public.clube_point_rules
  for update to authenticated
  using((select public.clube_is_admin()))
  with check((select public.clube_is_admin()));

create policy clube_points_select on public.clube_point_events
  for select to authenticated
  using(student_id=(select auth.uid()) or (select public.clube_is_admin()));

create policy clube_rewards_select on public.clube_rewards
  for select to authenticated
  using((select public.clube_is_admin()) or
    (is_active and exists(select 1 from public.clube_profiles p
      where p.id=(select auth.uid()) and p.is_active)));
create policy clube_rewards_insert_admin on public.clube_rewards
  for insert to authenticated with check((select public.clube_is_admin()));
create policy clube_rewards_update_admin on public.clube_rewards
  for update to authenticated
  using((select public.clube_is_admin()))
  with check((select public.clube_is_admin()));

create policy clube_requests_select on public.clube_reward_requests
  for select to authenticated
  using(student_id=(select auth.uid()) or (select public.clube_is_admin()));

-- Nenhum usuário pode alterar histórico, pedidos ou permissão por API REST.
revoke all on public.clube_admins from anon;
revoke all on public.clube_profiles, public.clube_point_events,
  public.clube_point_rules, public.clube_rewards, public.clube_reward_requests from anon;
revoke all on public.clube_admins from authenticated;
grant select on public.clube_admins to authenticated;
revoke all on public.clube_profiles, public.clube_point_events,
  public.clube_point_rules, public.clube_rewards, public.clube_reward_requests from authenticated;
grant select on public.clube_profiles, public.clube_point_events,
  public.clube_point_rules, public.clube_rewards, public.clube_reward_requests to authenticated;
grant update(is_active,full_name) on public.clube_profiles to authenticated;
grant update(points,label,is_active,sort_order) on public.clube_point_rules to authenticated;
grant insert,update(name,category,description,points,stock,icon,theme,is_active)
  on public.clube_rewards to authenticated;

-- Pontos sempre lançados no servidor com serialização por aluno. Resgates
-- aguardando aprovação ficam reservados e não podem ser gastos duas vezes.
create or replace function public.clube_award_points(
  p_student_id uuid, p_type text, p_points integer, p_note text default ''
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
  v_enabled boolean;
  v_balance bigint;
  v_reserved bigint;
  v_id uuid;
begin
  if not public.clube_is_admin() then
    raise exception 'Apenas o administrador pode lançar pontos.';
  end if;
  if p_type not in ('renovacao','indicacao','foto','desafio','aniversario','ajuste')
    or p_points is null or p_points=0 or abs(p_points)>100000 then
    raise exception 'Movimentação inválida.';
  end if;
  if p_type='ajuste' and length(trim(coalesce(p_note,'')))=0 then
    raise exception 'O ajuste exige justificativa.';
  end if;
  if p_type<>'ajuste' and p_points < 0 then
    raise exception 'Créditos de atividade não podem ser negativos.';
  end if;
  select p.is_active into v_enabled from public.clube_profiles p
  where p.id=p_student_id for update;
  if v_enabled is distinct from true then
    raise exception 'Aluno inexistente ou ainda não aprovado.';
  end if;
  select coalesce(sum(e.points),0) into v_balance
    from public.clube_point_events e
    where e.student_id=p_student_id and e.created_at>=date_trunc('year',now());
  select coalesce(sum(r.points),0) into v_reserved
    from public.clube_reward_requests r
    where r.student_id=p_student_id and r.status='pending'
      and r.created_at>=date_trunc('year',now());
  if v_balance-v_reserved+p_points<0 then
    raise exception 'Saldo disponível insuficiente para o ajuste.';
  end if;
  insert into public.clube_point_events(student_id,event_type,points,note,performed_by)
  values(p_student_id,p_type,p_points,coalesce(p_note,''),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.clube_request_reward(p_reward_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_enabled boolean;
  v_reward public.clube_rewards%rowtype;
  v_balance bigint;
  v_reserved bigint;
  v_id uuid;
begin
  if v_user is null then raise exception 'Faça login primeiro.';end if;
  select p.is_active into v_enabled from public.clube_profiles p
  where p.id=v_user for update;
  if v_enabled is distinct from true then
    raise exception 'Seu cadastro ainda está aguardando aprovação.';
  end if;
  select * into v_reward from public.clube_rewards where id=p_reward_id for update;
  if not found or not v_reward.is_active or v_reward.stock<=0 then
    raise exception 'Recompensa indisponível.';
  end if;
  select coalesce(sum(points),0) into v_balance from public.clube_point_events
   where student_id=v_user and created_at>=date_trunc('year',now());
  select coalesce(sum(points),0) into v_reserved from public.clube_reward_requests
   where student_id=v_user and status='pending'
     and created_at>=date_trunc('year',now());
  if v_balance-v_reserved<v_reward.points then
    raise exception 'Pontos insuficientes.';
  end if;
  if exists(select 1 from public.clube_reward_requests
    where student_id=v_user and reward_id=p_reward_id and status='pending') then
    raise exception 'Já existe um resgate aguardando análise para este prêmio.';
  end if;
  insert into public.clube_reward_requests(student_id,reward_id,reward_name,points)
  values(v_user,p_reward_id,v_reward.name,v_reward.points)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.clube_decide_reward(p_request_id uuid,p_approve boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  v_sid uuid;
  v_req public.clube_reward_requests%rowtype;
  v_reward public.clube_rewards%rowtype;
  v_balance bigint;
begin
  if not public.clube_is_admin() then
    raise exception 'Apenas o administrador pode aprovar resgates.';
  end if;
  select student_id into v_sid from public.clube_reward_requests where id=p_request_id;
  if not found then raise exception 'Pedido não encontrado.';end if;
  perform 1 from public.clube_profiles where id=v_sid for update;
  select * into v_req from public.clube_reward_requests where id=p_request_id for update;
  if v_req.status<>'pending' then raise exception 'Solicitação já processada.';end if;
  if p_approve then
    if v_req.created_at<date_trunc('year',now()) then
      raise exception 'Solicitação de ano anterior exige avaliação manual.';
    end if;
    select * into v_reward from public.clube_rewards where id=v_req.reward_id for update;
    if not found or v_reward.stock<1 then raise exception 'Sem estoque disponível.';end if;
    select coalesce(sum(points),0) into v_balance from public.clube_point_events
      where student_id=v_sid and created_at>=date_trunc('year',now());
    if v_balance<v_req.points then raise exception 'Saldo insuficiente.';end if;
    update public.clube_rewards set stock=stock-1 where id=v_req.reward_id;
    insert into public.clube_point_events(student_id,event_type,points,note,performed_by,reference_id)
      values(v_sid,'resgate',-v_req.points,'Resgate aprovado: '||v_req.reward_name,auth.uid(),v_req.id::text);
  end if;
  update public.clube_reward_requests
    set status=case when p_approve then 'approved' else 'rejected' end,
        resolved_at=now(),resolved_by=auth.uid()
    where id=p_request_id;
  return true;
end;
$$;

-- Revogar execução pública por padrão; apenas sessões autenticadas invocam.
revoke all on function public.clube_award_points(uuid,text,integer,text) from public,anon;
revoke all on function public.clube_request_reward(uuid) from public,anon;
revoke all on function public.clube_decide_reward(uuid,boolean) from public,anon;
grant execute on function public.clube_award_points(uuid,text,integer,text) to authenticated;
grant execute on function public.clube_request_reward(uuid) to authenticated;
grant execute on function public.clube_decide_reward(uuid,boolean) to authenticated;

-- PRIMEIRO ADMINISTRADOR:
-- 1) Criar usuário pelo Supabase Auth com e-mail confirmado.
-- 2) No SQL Editor privado (somente dono do projeto), executar UMA VEZ:
-- insert into public.clube_admins(user_id)
-- select id from auth.users where lower(email)=lower('EMAIL_ADMIN_APROVADO');
--
-- 3) Ativar perfil desse admin caso necessário:
-- update public.clube_profiles set is_active=true
-- where id in(select user_id from public.clube_admins);
--
-- Usar a chave publicável (publishable/anon) somente em VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY.
-- NUNCA expor chave secreta, service_role ou credenciais de banco ao front-end.
-- Este script presume projeto novo. Conferir privilégios e RLS após rodar.
