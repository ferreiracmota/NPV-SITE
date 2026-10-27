-- Tabelas Instagram são exclusivas do backend do Clube NPV.
-- Políticas de negativa explícita: clientes anon e authenticated não acessam nenhuma linha.
-- A API Vercel usa a service_role apenas no servidor.
begin;
create policy clube_ig_links_no_client_access on public.clube_instagram_links
  for all to anon, authenticated using (false) with check (false);
create policy clube_ig_codes_no_client_access on public.clube_instagram_link_codes
  for all to anon, authenticated using (false) with check (false);
create policy clube_ig_events_no_client_access on public.clube_instagram_story_events
  for all to anon, authenticated using (false) with check (false);
commit;
