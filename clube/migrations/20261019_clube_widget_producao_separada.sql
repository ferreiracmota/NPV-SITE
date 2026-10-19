-- Habilita o Widget do Site NPV homologado no dominio oficial sem
-- misturar dados de producao com o rascunho/versao publicada do Preview.
-- A tabela ja existe; esta migracao muda SOMENTE politicas de widget e sua RPC.
alter table public.clube_site_widget_settings enable row level security;

drop policy if exists clube_widget_admin_insert on public.clube_site_widget_settings;
create policy clube_widget_admin_insert on public.clube_site_widget_settings
for insert to authenticated
with check (
 (select public.clube_is_admin())
 and scope in ('preview','production')
);

drop policy if exists clube_widget_admin_update on public.clube_site_widget_settings;
create policy clube_widget_admin_update on public.clube_site_widget_settings
for update to authenticated
using ((select public.clube_is_admin()) and scope in ('preview','production'))
with check ((select public.clube_is_admin()) and scope in ('preview','production'));

-- Fonte PUBLICA SOMENTE das configuracoes publicadas de cada ambiente.
-- Nao consulta perfis, extratos, pontos reais nem o conteudo draft.
create or replace function public.clube_site_widget_public(p_scope text default 'preview')
returns jsonb language plpgsql stable security definer
set search_path=''
as $$
declare
  v jsonb;
  v_rewards jsonb;
  v_partners jsonb;
begin
  if p_scope is null or p_scope not in ('preview','production') then return null; end if;

  select published into v
  from public.clube_site_widget_settings
  where scope=p_scope;
  if v is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'name',r.name,'points',r.points,'image_path',r.image_path,
    'icon',r.icon,'description',r.description) order by chosen.ord),'[]'::jsonb)
  into v_rewards
  from jsonb_array_elements_text(
    case when jsonb_typeof(v->'reward_ids')='array' then v->'reward_ids' else '[]'::jsonb end)
    with ordinality as chosen(value,ord)
  join public.clube_rewards r on r.id::text=chosen.value
  where r.active or r.showcase;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'discount_percent',p.discount_percent,
    'logo_url',p.logo_url,'logo_key',p.logo_key,'link_url',p.link_url,
    'coupon_code',p.coupon_code) order by chosen.ord),'[]'::jsonb)
  into v_partners
  from jsonb_array_elements_text(
    case when jsonb_typeof(v->'partner_ids')='array' then v->'partner_ids' else '[]'::jsonb end)
    with ordinality as chosen(value,ord)
  join public.clube_partners p on p.id::text=chosen.value
  where p.active;

  return v || jsonb_build_object('rewards',v_rewards,'partners',v_partners);
end;
$$;
revoke all on function public.clube_site_widget_public(text) from public;
grant execute on function public.clube_site_widget_public(text) to anon, authenticated;

-- Sem INSERT de dados: producao inicia com o visual aprovado embutido no app.
-- A primeira alteracao somente ocorre quando o administrador publicar no escopo production.
