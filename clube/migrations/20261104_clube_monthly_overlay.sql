-- NPV | intensidade do gradiente verde na capa do desafio mensal.
-- 65% reproduz o escurecimento atual. 0% remove a camada; 100% intensifica.
-- Somente apresentação visual: não modifica pontos, regras, vínculos ou desafios existentes.
alter table public.clube_monthly_challenges
  add column if not exists cover_overlay_strength integer not null default 65
  constraint clube_monthly_challenges_overlay_range
  check (cover_overlay_strength between 0 and 100);
