-- Leitura do parâmetro público de pontos por km para alunos aprovados.
-- Não muda dados, não libera anon e não permite editar sem privilégio administrativo.
drop policy if exists clube_km_settings_admin_select on public.clube_km_settings;
create policy clube_km_settings_read_approved_or_admin
on public.clube_km_settings for select to authenticated
using ((select public.clube_member_approved()) or (select public.clube_is_admin()));
