-- Correção do status real de moderação de Stories NPV.
-- Eventos Instagram aguardando aprovação usam status "review" (não "pending").
-- Não altera tabelas de pontos, limites ou critérios de aprovação.
create or replace function npv_internal.push_story_on_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
 if new.status='review' and (tg_op='INSERT' or old.status is distinct from new.status) then
  perform npv_internal.send_push_webhook('story',new.event_id::text);
 end if;
 return new;
end $$;
revoke all on function npv_internal.push_story_on_insert() from public,anon,authenticated;

drop trigger if exists npv_push_story_pending on public.clube_instagram_story_events;
create trigger npv_push_story_pending after insert on public.clube_instagram_story_events
for each row execute function npv_internal.push_story_on_insert();

drop trigger if exists npv_push_story_status_review on public.clube_instagram_story_events;
create trigger npv_push_story_status_review after update of status on public.clube_instagram_story_events
for each row when (new.status='review' and old.status is distinct from new.status)
execute function npv_internal.push_story_on_insert();
