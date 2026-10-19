-- Widget do site NPV: infraestrutura compartilhada, dados de preview isolados.
-- Nenhum componente de producao le esta tabela. Nao cria nem habilita escopo production.
create table if not exists public.clube_site_widget_settings (
  scope text primary key check (scope in ('preview','production')),
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  updated_at timestamptz not null default now()
);
alter table public.clube_site_widget_settings enable row level security;
revoke all on public.clube_site_widget_settings from public, anon;
grant select, insert, update on public.clube_site_widget_settings to authenticated;
drop policy if exists clube_widget_admin_select on public.clube_site_widget_settings;
create policy clube_widget_admin_select on public.clube_site_widget_settings
  for select to authenticated using ((select public.clube_is_admin()));
drop policy if exists clube_widget_admin_insert on public.clube_site_widget_settings;
create policy clube_widget_admin_insert on public.clube_site_widget_settings
  for insert to authenticated with check ((select public.clube_is_admin()) and scope='preview');
drop policy if exists clube_widget_admin_update on public.clube_site_widget_settings;
create policy clube_widget_admin_update on public.clube_site_widget_settings
  for update to authenticated using ((select public.clube_is_admin()) and scope='preview')
  with check ((select public.clube_is_admin()) and scope='preview');
revoke delete on public.clube_site_widget_settings from authenticated;

-- Leitura PUBLICA sanitizada do preview publicado, sem expor rascunhos e sem dados pessoais.
-- Dados reais: apenas o catalogo publico selecionado pelo admin, nunca dados de alunos.
create or replace function public.clube_site_widget_public(p_scope text default 'preview')
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
 v jsonb; v_rewards jsonb; v_partners jsonb;
begin
 if p_scope is distinct from 'preview' then return null; end if;
 select published into v from public.clube_site_widget_settings where scope='preview';
 if v is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'name',r.name,'points',r.points,'image_path',r.image_path,'icon',r.icon,
   'description',r.description) order by v_id.ord),'[]'::jsonb)
 into v_rewards
 from jsonb_array_elements_text(case when jsonb_typeof(v->'reward_ids')='array' then v->'reward_ids' else '[]'::jsonb end)
 with ordinality as v_id(value,ord)
 join public.clube_rewards r on r.id::text=v_id.value
 where r.active or r.showcase;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'name',p.name,'discount_percent',p.discount_percent,
   'logo_url',p.logo_url,'logo_key',p.logo_key,'link_url',p.link_url,
   'coupon_code',p.coupon_code) order by v_id.ord),'[]'::jsonb)
 into v_partners
 from jsonb_array_elements_text(case when jsonb_typeof(v->'partner_ids')='array' then v->'partner_ids' else '[]'::jsonb end)
 with ordinality as v_id(value,ord)
 join public.clube_partners p on p.id::text=v_id.value
 where p.active;
 return v || jsonb_build_object('rewards',v_rewards,'partners',v_partners);
end;
$$;
revoke all on function public.clube_site_widget_public(text) from public;
grant execute on function public.clube_site_widget_public(text) to anon, authenticated;

-- Deliberadamente sem INSERT de defaults: Preview usa aparencia aprovada em fallback
-- ate o administrador SALVAR e PUBLICAR; producao nao ganha linha de configuracao.
