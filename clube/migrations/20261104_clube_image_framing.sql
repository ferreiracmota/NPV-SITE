-- NPV | Enquadramento não destrutivo das imagens de desafios e recompensas.
-- Guarda apenas posição e zoom. Arquivos originais e pontuações ficam inalterados.

alter table public.clube_monthly_challenges
  add column if not exists cover_position_x numeric(5,2) not null default 50
    check (cover_position_x between 0 and 100),
  add column if not exists cover_position_y numeric(5,2) not null default 50
    check (cover_position_y between 0 and 100),
  add column if not exists cover_zoom numeric(4,2) not null default 1
    check (cover_zoom between 1 and 2.5);

alter table public.clube_rewards
  add column if not exists image_position_x numeric(5,2) not null default 50
    check (image_position_x between 0 and 100),
  add column if not exists image_position_y numeric(5,2) not null default 50
    check (image_position_y between 0 and 100),
  add column if not exists image_zoom numeric(4,2) not null default 1
    check (image_zoom between 1 and 2.5);
