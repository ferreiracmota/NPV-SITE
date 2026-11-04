-- NPV | Desafio mensal padrão e capa por mês.
-- Não altera pontuação já creditada, lançamentos, alunos nem regras do Strava.
alter table public.clube_monthly_challenges
  add column if not exists cover_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='clube_monthly_challenges_cover_path_valid'
      and conrelid='public.clube_monthly_challenges'::regclass
  ) then
    alter table public.clube_monthly_challenges
      add constraint clube_monthly_challenges_cover_path_valid
      check (cover_path is null or cover_path ~ '^images/[a-f0-9-]{36}\.(jpg|png|webp)$');
  end if;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('clube-npv-desafios','clube-npv-desafios',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists clube_challenge_cover_admin_insert on storage.objects;
create policy clube_challenge_cover_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id='clube-npv-desafios'
    and (select public.clube_is_admin())
    and name ~ '^images/[a-f0-9-]{36}\.(jpg|png|webp)$'
  );

-- Só cria o desafio de 50 km se o mês ainda não tiver nenhum desafio.
-- Um mês previamente personalizado, mesmo inativo, permanece intocado.
create or replace function public.clube_ensure_challenge_month(p_month_key text)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_current text := to_char(timezone('America/Sao_Paulo',now()),'YYYY-MM');
  v_next text := to_char(date_trunc('month',timezone('America/Sao_Paulo',now())) + interval '1 month','YYYY-MM');
begin
  if p_month_key is null or p_month_key not in (v_current,v_next) then
    raise exception 'Mes fora da janela permitida' using errcode='22023';
  end if;
  if not (
    coalesce(auth.jwt()->>'role','')='service_role'
    or coalesce((select public.clube_is_admin()),false)
    or coalesce((select public.clube_member_approved()),false)
  ) then
    raise exception 'Acesso ao Clube necessario' using errcode='42501';
  end if;

  insert into public.clube_monthly_challenges
    (month_key,name,goal_km,reward_points,active,position)
  select p_month_key,'Desafio 50 km',50,300,true,1
  where not exists (
    select 1 from public.clube_monthly_challenges where month_key=p_month_key
  )
  on conflict do nothing;
end;
$function$;

revoke all on function public.clube_ensure_challenge_month(text) from public,anon;
grant execute on function public.clube_ensure_challenge_month(text) to authenticated,service_role;

-- Corrige o mês atual sem tocar nas configurações históricas de outubro.
insert into public.clube_monthly_challenges
  (month_key,name,goal_km,reward_points,active,position)
select '2026-11','Desafio 50 km',50,300,true,1
where to_char(timezone('America/Sao_Paulo',now()),'YYYY-MM')='2026-11'
  and not exists(select 1 from public.clube_monthly_challenges where month_key='2026-11')
on conflict do nothing;
