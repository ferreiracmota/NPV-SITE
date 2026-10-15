-- Clube NPV — esquema inicial para um projeto NOVO do Supabase.
-- Não executar contra projetos que já possuam tabelas com estes nomes.
-- Antes de ativar: configurar Auth -> confirmação de email e URLs permitidas.
-- Todos os movimentos de pontos são auditáveis e imutáveis.

create extension if not exists pgcrypto;

create table public.clube_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index clube_profiles_approval_idx on public.clube_profiles(approved, created_at desc);

create table public.clube_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.clube_point_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id),
  event_type text not null check (event_type in ('renovacao','indicacao','foto','desafio','aniversario','ajuste','resgate')),
  points integer not null check (points between -100000 and 100000 and points <> 0),
  note text not null default '',
  reference_id text unique,
  performed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint clube_adjustments_note check (event_type <> 'ajuste' or length(trim(note)) > 0)
);
create index clube_point_events_student_date_idx on public.clube_point_events(student_id, created_at desc);

create table public.clube_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 3 and 75),
  category text not null default 'Benefícios',
  description text not null default '',
  points integer not null check (points between 1 and 100000),
  stock integer not null default 0 check (stock between 0 and 100000),
  icon text not null default 'gift',
  theme text not null default 'lime',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clube_redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.clube_profiles(id),
  reward_id uuid not null references public.clube_rewards(id),
  reward_name text not null,
  points integer not null check (points > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
create index clube_redemptions_student_idx on public.clube_redemptions(student_id, created_at desc);
create index clube_redemptions_pending_idx on public.clube_redemptions(status, created_at desc);

-- A única forma de elevar privilégios é inserir o usuário na tabela de admins
-- pelo SQL Editor com credenciais de proprietário. Nunca por signup/metadata.
create function public.clube_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists(select 1 from public.clube_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.clube_is_admin() from public;
grant execute on function public.clube_is_admin() to authenticated;

create function public.clube_member_approved()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists(select 1 from public.clube_profiles where id = (select auth.uid()) and approved);
$$;
revoke all on function public.clube_member_approved() from public;
grant execute on function public.clube_member_approved() to authenticated;

create function public.clube_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.clube_profiles(id, full_name, email, approved)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 150),
    left(coalesce(new.email,''), 320),
    false
  );
  return new;
end;
$$;
create trigger clube_after_auth_signup
after insert on auth.users for each row execute function public.clube_new_auth_user();

alter table public.clube_profiles enable row level security;
alter table public.clube_admins enable row level security;
alter table public.clube_point_events enable row level security;
alter table public.clube_rewards enable row level security;
alter table public.clube_redemptions enable row level security;

create policy "clube_profiles_read_self_or_admin" on public.clube_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.clube_is_admin()));
create policy "clube_profiles_admin_approval" on public.clube_profiles
  for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));

create policy "clube_admins_read_own" on public.clube_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "clube_points_read_approved_owner_or_admin" on public.clube_point_events
  for select to authenticated
  using ((student_id = (select auth.uid()) and (select public.clube_member_approved())) or (select public.clube_is_admin()));

create policy "clube_rewards_read_approved_or_admin" on public.clube_rewards
  for select to authenticated
  using ((active and (select public.clube_member_approved())) or (select public.clube_is_admin()));
create policy "clube_rewards_admin_insert" on public.clube_rewards
  for insert to authenticated
  with check ((select public.clube_is_admin()));
create policy "clube_rewards_admin_update" on public.clube_rewards
  for update to authenticated
  using ((select public.clube_is_admin()))
  with check ((select public.clube_is_admin()));

create policy "clube_redemptions_read_approved_owner_or_admin" on public.clube_redemptions
  for select to authenticated
  using ((student_id = (select auth.uid()) and (select public.clube_member_approved())) or (select public.clube_is_admin()));

-- Proibido alterar a autoria/histórico pelo cliente. Funções abaixo são o único
-- caminho de gravação no extrato e nos resgates.
revoke insert, update, delete on public.clube_point_events from anon, authenticated;
revoke insert, update, delete on public.clube_redemptions from anon, authenticated;
revoke insert, delete on public.clube_profiles from anon, authenticated;
revoke insert, update, delete on public.clube_admins from anon, authenticated;
revoke delete on public.clube_rewards from anon, authenticated;

-- O admin concede pontos manualmente. Saldo anual e reservas pendentes são
-- verificados no servidor, sob bloqueio por aluno.
create function public.clube_award_points(
  p_student_id uuid,
  p_type text,
  p_points integer,
  p_note text default ''
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_result uuid;
  v_current integer;
  v_held integer;
  v_year timestamptz := date_trunc('year', now());
begin
  if not public.clube_is_admin() then raise exception 'Permissão negada'; end if;
  if p_type not in ('renovacao','indicacao','foto','desafio','aniversario','ajuste')
     or p_points is null or p_points = 0 or p_points > 100000 or p_points < -100000 then
    raise exception 'Atividade ou pontuação inválida';
  end if;
  if p_type='ajuste' and length(trim(coalesce(p_note,'')))=0 then
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
end;
$$;
revoke all on function public.clube_award_points(uuid,text,integer,text) from public;
grant execute on function public.clube_award_points(uuid,text,integer,text) to authenticated;

-- Solicitação pendente reserva PONTOS, mas não garante estoque até aprovação.
-- Não aceitamos dois pedidos pendentes do mesmo item para o mesmo aluno.
create function public.clube_request_redemption(p_reward_id uuid)
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
  insert into public.clube_redemptions(student_id,reward_id,reward_name,points)
    values(v_student,v_reward.id,v_reward.name,v_reward.points)
    returning id into v_result;
  return v_result;
end;
$$;
revoke all on function public.clube_request_redemption(uuid) from public;
grant execute on function public.clube_request_redemption(uuid) to authenticated;

create function public.clube_resolve_redemption(p_id uuid,p_approve boolean)
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
    insert into public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by)
      values(v_row.student_id,'resgate',-v_row.points,'Resgate aprovado: '||v_row.reward_name,
             'clube-resgate:'||v_row.id::text,v_operator);
  end if;
  update public.clube_redemptions
     set status=case when p_approve then 'approved' else 'rejected' end,
         resolved_at=now(),resolved_by=v_operator
   where id=p_id;
end;
$$;
revoke all on function public.clube_resolve_redemption(uuid,boolean) from public;
grant execute on function public.clube_resolve_redemption(uuid,boolean) to authenticated;

insert into public.clube_rewards(name,category,description,points,stock,icon,theme,active) values
('Camiseta NPV','Exclusivo NPV','Produto ilustrativo; sem resgate real até ativação',1000,4,'shirt','ink',false),
('Coqueteleira NPV','Exclusivo NPV','Produto ilustrativo; sem resgate real até ativação',450,7,'cup','lime',false),
('Kit snacks parceiro','Parceiros','Prêmio ilustrativo; nenhum acordo confirmado',700,5,'package','pink',false),
('Kit de hidratação','Parceiros','Prêmio ilustrativo; nenhum acordo confirmado',600,3,'water','sky',false),
('Benefício especial','Benefícios','Prêmio ilustrativo; nenhum acordo confirmado',300,10,'ticket','cream',false);

-- PRIMEIRO ADMIN: após criar a conta em Auth, executar manualmente pelo SQL Editor
-- insert into public.clube_admins(user_id)
-- select id from auth.users where email = 'EMAIL_ADMIN_APROVADO';
--
-- SEMPRE testar no mínimo duas contas diferentes e um usuário não aprovado.
-- Os produtos de demonstração acima NÃO são ofertas válidas; começam INATIVOS.
-- Antes de ativar, cadastrar recompensas verdadeiras e confirmar disponibilidade.
