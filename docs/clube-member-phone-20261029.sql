-- Telefone privado opcional da aluna, sem alterar autenticacao ou aprovacoes.
-- A coluna herda o RLS existente de clube_profiles (leitura da própria pessoa/admin).
-- Escrita limitada à rota backend autenticada /api/clube/profile; nenhuma policy de
-- UPDATE para alunas é concedida, preservando approved e email.
alter table public.clube_profiles
  add column if not exists phone varchar(24);
comment on column public.clube_profiles.phone is
  'Telefone opcional fornecido pela aluna, visível apenas em área autenticada; nunca usado em cartão compartilhável.';
