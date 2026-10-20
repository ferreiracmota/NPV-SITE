-- NPV 20/10/2026 — somente parâmetros editáveis já existentes.
-- Não atualiza clube_point_events, clube_redemptions, perfis nem saldos.
-- Lançamentos seguem validação administrativa; não ativa Strava nem créditos automáticos.
begin;
update public.clube_point_rules
set label=case event_type
  when 'renovacao' then 'Renovação da assinatura'
  when 'desafio' then 'Desafio mensal'
  when 'foto' then 'Foto de antes e depois'
  when 'aniversario' then 'Aniversário'
  when 'indicacao' then 'Indicação convertida em assinante' end,
points=case event_type
  when 'renovacao' then 400
  when 'desafio' then 0 -- variável: usar recompensa do desafio mensal ativo
  when 'foto' then 200
  when 'aniversario' then 100
  when 'indicacao' then 1000 end,
position=case event_type
  when 'renovacao' then 1
  when 'desafio' then 2
  when 'foto' then 5
  when 'aniversario' then 6
  when 'indicacao' then 7 end,
updated_at=now()
where event_type in ('renovacao','desafio','foto','aniversario','indicacao');
insert into public.clube_point_rules(event_type,label,points,position,updated_at)
values
('extra_11111111111111111111111111111111','Corrida ou caminhada no Strava',2,3,now()),
('extra_22222222222222222222222222222222','Story marcando @naopensevai',200,4,now())
on conflict(event_type) do update
set label=excluded.label,points=excluded.points,position=excluded.position,updated_at=now();
update public.clube_km_settings
set points_per_km=2,eligible_sports=array['Run','Walk'],updated_at=now()
where singleton=true;
do $$
begin
  if (select count(*) from public.clube_point_rules where event_type in (
    'renovacao','desafio','foto','aniversario','indicacao',
    'extra_11111111111111111111111111111111',
    'extra_22222222222222222222222222222222'))<>7
  then raise exception 'As sete regras de benefícios não foram confirmadas'; end if;
end $$;
commit;
