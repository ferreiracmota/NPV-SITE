-- Permite apagar desafios individualmente pela área administrativa.
-- O histórico de atividades e os pontos dos alunos não são alterados.
-- Autenticados comuns não podem excluir: RLS exige clube_is_admin().
alter table public.clube_monthly_challenges enable row level security;
grant delete on public.clube_monthly_challenges to authenticated;
revoke delete on public.clube_monthly_challenges from anon;
drop policy if exists clube_challenge_month_admin_delete on public.clube_monthly_challenges;
create policy clube_challenge_month_admin_delete
on public.clube_monthly_challenges
for delete to authenticated
using ((select public.clube_is_admin()));
