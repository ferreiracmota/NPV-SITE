-- NPV / Clube: Web Push admin-only, sem serviços pagos e sem mudar regras de negócio.
-- A migração deve ser aplicada somente após revisão em preview.
create extension if not exists pg_net with schema extensions;

create table if not exists public.clube_admin_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint npv_push_endpoint_https check (left(endpoint,8)='https://')
);
alter table public.clube_admin_push_subscriptions enable row level security;
revoke all on table public.clube_admin_push_subscriptions from anon, authenticated;
grant select,insert,update,delete on table public.clube_admin_push_subscriptions to service_role;
create index if not exists idx_clube_push_enabled on public.clube_admin_push_subscriptions(admin_id) where enabled;

create table if not exists public.clube_admin_push_events (
 kind text not null check(kind in ('registration','redemption','story')),
 source_id text not null,
 status text not null check(status in ('processing','sent','not_delivered')),
 delivered_count integer not null default 0,
 created_at timestamptz not null default now(),
 primary key(kind,source_id)
);
alter table public.clube_admin_push_events enable row level security;
revoke all on table public.clube_admin_push_events from anon, authenticated;
grant select,insert,update on table public.clube_admin_push_events to service_role;

create schema if not exists npv_internal;
revoke all on schema npv_internal from public, anon, authenticated;
grant usage on schema npv_internal to postgres;

create or replace function npv_internal.send_push_webhook(p_kind text,p_id text)
returns void language plpgsql security definer
set search_path=pg_catalog,public,vault,net
as $$
declare secret_value text;
begin
 if p_kind not in ('registration','redemption','story') or p_id is null then return; end if;
 select decrypted_secret into secret_value
 from vault.decrypted_secrets where name='npv_admin_push_webhook_secret' limit 1;
 if secret_value is null then return; end if;
 perform net.http_post(
   url:='https://www.naopensevai.com/api/clube/admin-push?action=dispatch',
   body:=jsonb_build_object('kind',p_kind,'id',p_id),
   headers:=jsonb_build_object('Content-Type','application/json','x-npv-push-secret',secret_value),
   timeout_milliseconds:=3000
 );
end $$;
revoke all on function npv_internal.send_push_webhook(text,text) from public,anon,authenticated;

create or replace function npv_internal.push_redemption_on_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
 if new.status='pending' and new.is_test is distinct from true then
  perform npv_internal.send_push_webhook('redemption',new.id::text);
 end if;
 return new;
end $$;
revoke all on function npv_internal.push_redemption_on_insert() from public,anon,authenticated;
drop trigger if exists npv_push_redemption_pending on public.clube_redemptions;
create trigger npv_push_redemption_pending after insert on public.clube_redemptions
for each row execute function npv_internal.push_redemption_on_insert();

create or replace function npv_internal.push_story_on_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
 if new.status in ('pending','awaiting_review','received') then
  perform npv_internal.send_push_webhook('story',new.event_id::text);
 end if;
 return new;
end $$;
revoke all on function npv_internal.push_story_on_insert() from public,anon,authenticated;
drop trigger if exists npv_push_story_pending on public.clube_instagram_story_events;
create trigger npv_push_story_pending after insert on public.clube_instagram_story_events
for each row execute function npv_internal.push_story_on_insert();

-- Não avisa cadastros antes da confirmação do e-mail.
-- Para quem já confirmou o e-mail antes de seu perfil ser criado:
create or replace function npv_internal.push_registration_on_profile()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
 if new.approved=false and exists(
   select 1 from auth.users where id=new.id and email_confirmed_at is not null
 ) then
   perform npv_internal.send_push_webhook('registration',new.id::text);
 end if;
 return new;
end $$;
revoke all on function npv_internal.push_registration_on_profile() from public,anon,authenticated;
drop trigger if exists npv_push_registration_on_insert on public.clube_profiles;
create trigger npv_push_registration_on_insert after insert on public.clube_profiles
for each row execute function npv_internal.push_registration_on_profile();

-- Para quem confirma o e-mail depois da criação do perfil:
create or replace function npv_internal.push_registration_on_confirm()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
 if old.email_confirmed_at is null and new.email_confirmed_at is not null and
   exists(select 1 from public.clube_profiles where id=new.id and approved=false) then
   perform npv_internal.send_push_webhook('registration',new.id::text);
 end if;
 return new;
end $$;
revoke all on function npv_internal.push_registration_on_confirm() from public,anon,authenticated;
drop trigger if exists npv_push_registration_email_confirmed on auth.users;
create trigger npv_push_registration_email_confirmed after update of email_confirmed_at on auth.users
for each row execute function npv_internal.push_registration_on_confirm();
