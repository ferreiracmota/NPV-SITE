-- Clube NPV: parceiros de descontos (não altera pontos, prêmios ou resgates).
create table if not exists public.clube_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 90),
  logo_key text not null default '' check (char_length(logo_key) <= 40),
  logo_url text not null default '' check (char_length(logo_url) <= 750),
  link_url text not null check (link_url ~* '^https://[^[:space:]]+$' and char_length(link_url) <= 1000),
  discount_percent integer check (discount_percent between 1 and 100),
  coupon_code text not null default '' check (char_length(coupon_code) <= 60),
  details text not null default '' check (char_length(details) <= 250),
  active boolean not null default true,
  position integer not null default 100 check (position between 0 and 10000),
  created_at timestamptz not null default now()
);
alter table public.clube_partners enable row level security;
revoke all on public.clube_partners from anon;
grant select,insert,update on public.clube_partners to authenticated;
drop policy if exists clube_partners_member_read on public.clube_partners;
create policy clube_partners_member_read on public.clube_partners
for select to authenticated
using (
  (active and (select public.clube_member_approved()))
  or (select public.clube_is_admin())
);
drop policy if exists clube_partners_admin_insert on public.clube_partners;
create policy clube_partners_admin_insert on public.clube_partners
for insert to authenticated
with check ((select public.clube_is_admin()));
drop policy if exists clube_partners_admin_update on public.clube_partners;
create policy clube_partners_admin_update on public.clube_partners
for update to authenticated
using ((select public.clube_is_admin()))
with check ((select public.clube_is_admin()));
create index if not exists clube_partners_active_position_idx
  on public.clube_partners(active,position);
-- Logos/códigos já expostos no site principal; descontos percentuais
-- são propositalmente NULL até a administração confirmar a oferta.
insert into public.clube_partners(name,logo_key,logo_url,link_url,coupon_code,position)
select v.name,v.logo_key,v.logo_url,v.link_url,v.coupon_code,v.position
from (values
  ('Cacow','','https://cacow.com.br/cdn/shop/files/Template_de_Banner_2.0_-_by_Estudio_Gole_2_2b6ed56a-607b-42de-a4ca-4e857cb86466.png?v=1765388753&width=270','https://cacow.com.br/','NPV5',10),
  ('Z2 Performance','','https://z2performance.com/cdn/shop/files/logo_z2_azul_01.png?v=1725888283&width=100','https://z2performance.com/','Z2naopensevai',20),
  ('Hey!Mu','','https://acdn-us.mitiendanube.com/stores/005/950/623/themes/common/logo-1531537272-1743307940-4b210bcc33dbc7ef880a3ec47b1628e81743307940.png?0','https://heymu.com.br/','NPV10',30),
  ('LIQUIDZ','','/parceiros/logo-liquidz.svg','https://www.liquidz.com.br/','naopensevai',40),
  ('Cafezin Lounge','parceiro1','','https://cafezinlounge.saipos.com/home/nutrishakemlpqpz','NPV15',50),
  ('Cia do Esporte','parceiro2','','https://www.instagram.com/ciadoesporte2/','NPV10',60),
  ('TF Sports Running Betim','parceiro3','','https://link-prod.tfsports.com.br/events/running-betim-12505301321','NAOPENSEVAI',70),
  ('NF Moda Fitness','parceiro4','','https://www.instagram.com/nf.modafitness/','',80),
  ('Ciladas Burger','parceiro5','','https://www.instagram.com/ciladasburguer/','NPV15',90)
) as v(name,logo_key,logo_url,link_url,coupon_code,position)
where not exists (select 1 from public.clube_partners p where p.name=v.name);
