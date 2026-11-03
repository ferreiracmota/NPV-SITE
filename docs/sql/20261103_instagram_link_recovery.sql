-- NPV Instagram: intervalo entre tentativas de recuperação de Direct
-- Apenas metadado técnico; sem alterar vínculos ou pontuação.
alter table public.clube_instagram_link_codes
  add column if not exists last_meta_checked_at timestamptz;

comment on column public.clube_instagram_link_codes.last_meta_checked_at
  is 'Última tentativa de recuperar por API oficial o Direct de um código pendente; não guarda mensagens.';
