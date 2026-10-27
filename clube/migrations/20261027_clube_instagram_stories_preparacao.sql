-- PREPARAÇÃO, NÃO APLICADA: Instagram por DM + menção oficial de Story.
-- Rodar apenas após configurar o app Meta e confirmar rollout.
-- Segurança: somente backend com service_role; nenhuma escrita via navegador.
begin;

create table if not exists public.clube_instagram_links (
  student_id uuid primary key references public.clube_profiles(id) on delete cascade,
  instagram_scoped_id text not null unique check (instagram_scoped_id ~ '^[0-9]{5,40}$'),
  verified_at timestamptz not null default now()
);

create table if not exists public.clube_instagram_link_codes (
  student_id uuid primary key references public.clube_profiles(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists clube_instagram_codes_expiry_idx
  on public.clube_instagram_link_codes(expires_at);

create table if not exists public.clube_instagram_story_events (
  event_id text primary key check (char_length(event_id) between 4 and 320),
  instagram_scoped_id text not null check (instagram_scoped_id ~ '^[0-9]{5,40}$'),
  story_key text not null check (char_length(story_key) between 4 and 400),
  student_id uuid references public.clube_profiles(id) on delete set null,
  status text not null check (status in ('unlinked','limit_reached','credited','review','disabled')),
  points integer not null default 0 check (points in (0,200)),
  created_at timestamptz not null default now(),
  unique (instagram_scoped_id,story_key)
);
create index if not exists clube_instagram_events_student_idx
  on public.clube_instagram_story_events(student_id,created_at desc);

alter table public.clube_instagram_links enable row level security;
alter table public.clube_instagram_link_codes enable row level security;
alter table public.clube_instagram_story_events enable row level security;

revoke all on public.clube_instagram_links from public, anon, authenticated;
revoke all on public.clube_instagram_link_codes from public, anon, authenticated;
revoke all on public.clube_instagram_story_events from public, anon, authenticated;
grant select,insert,update,delete on public.clube_instagram_links to service_role;
grant select,insert,update,delete on public.clube_instagram_link_codes to service_role;
grant select,insert,update,delete on public.clube_instagram_story_events to service_role;

-- Associa exatamente o sender.id recebido da Meta ao titular do código enviado via DM.
create or replace function public.clube_instagram_claim_link(
  p_code_hash text, p_instagram_scoped_id text
) returns text
language plpgsql security definer set search_path=''
as $func$
declare v_student uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
     or p_instagram_scoped_id !~ '^[0-9]{5,40}$'
  then return 'invalid'; end if;
  select c.student_id into v_student
    from public.clube_instagram_link_codes c
    join public.clube_profiles p on p.id=c.student_id
   where c.code_hash=p_code_hash and c.expires_at>now() and p.approved
     for update of c;
  if v_student is null then return 'invalid_or_expired'; end if;
  -- Não se pode vincular um Instagram que já pertence a outra aluna.
  if exists(select 1 from public.clube_instagram_links l
     where l.instagram_scoped_id=p_instagram_scoped_id and l.student_id<>v_student)
  then return 'already_linked'; end if;
  insert into public.clube_instagram_links(student_id,instagram_scoped_id,verified_at)
    values(v_student,p_instagram_scoped_id,now())
    on conflict(student_id) do update
    set instagram_scoped_id=excluded.instagram_scoped_id,verified_at=excluded.verified_at;
  delete from public.clube_instagram_link_codes where student_id=v_student;
  return 'linked';
exception when unique_violation then
  return 'already_linked';
end
$func$;

-- Recepção idempotente e serializada por aluna; nem duplicidade nem limite mensal
-- dependem de JavaScript do navegador. Apenas assinado pela Meta e service_role.
create or replace function public.clube_instagram_receive_story(
  p_event_id text,
  p_instagram_scoped_id text,
  p_story_key text,
  p_actor_id uuid default null,
  p_award_enabled boolean default false
) returns text
language plpgsql security definer set search_path=''
as $func$
declare
  v_student uuid;
  v_status text;
  v_n integer;
  v_points integer;
begin
  if p_event_id is null or char_length(p_event_id) not between 4 and 320
     or p_instagram_scoped_id !~ '^[0-9]{5,40}$'
     or p_story_key is null or char_length(p_story_key) not between 4 and 400
  then return 'invalid'; end if;

  select l.student_id into v_student
    from public.clube_instagram_links l
    join public.clube_profiles p on p.id=l.student_id
   where l.instagram_scoped_id=p_instagram_scoped_id and p.approved
     for update of l;

  if exists(select 1 from public.clube_instagram_story_events e
      where e.event_id=p_event_id
         or (e.instagram_scoped_id=p_instagram_scoped_id and e.story_key=p_story_key))
  then return 'duplicate'; end if;

  v_status := case when v_student is null then 'unlinked'
                   when not p_award_enabled then 'review'
                   else 'review' end;

  if v_student is not null and p_award_enabled then
    -- O lançamento automático só é autorizado com ator técnico explicitamente
    -- designado e incluído no controle de administradores.
    if p_actor_id is null or not exists(
      select 1 from public.clube_admins where user_id=p_actor_id
    ) then
      v_status:='review';
    else
      select r.points into v_points from public.clube_point_rules r
       where r.event_type='extra_22222222222222222222222222222222';
      if v_points is null or v_points<>200 then
        v_status:='review';
      else
        select count(*) into v_n
          from public.clube_instagram_story_events e
         where e.student_id=v_student and e.status='credited'
           and (e.created_at at time zone 'America/Sao_Paulo')::date
                >= date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date;
        if v_n>=5 then v_status:='limit_reached';
        else v_status:='credited'; end if;
      end if;
    end if;
  end if;

  insert into public.clube_instagram_story_events(
    event_id,instagram_scoped_id,story_key,student_id,status,points
  ) values(
    p_event_id,p_instagram_scoped_id,p_story_key,v_student,v_status,
    case when v_status='credited' then 200 else 0 end
  );

  if v_status='credited' then
    insert into public.clube_point_events(
      student_id,event_type,points,note,reference_id,performed_by,is_test
    ) values(
      v_student,'extra_22222222222222222222222222222222',200,
      'Crédito automático por menção de Story no Instagram',
      'instagram_story:'||p_event_id,p_actor_id,false
    );
  end if;

  return v_status;
exception when unique_violation then return 'duplicate';
end
$func$;

revoke all on function public.clube_instagram_claim_link(text,text) from public,anon,authenticated;
revoke all on function public.clube_instagram_receive_story(text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.clube_instagram_claim_link(text,text) to service_role;
grant execute on function public.clube_instagram_receive_story(text,text,text,uuid,boolean) to service_role;

commit;