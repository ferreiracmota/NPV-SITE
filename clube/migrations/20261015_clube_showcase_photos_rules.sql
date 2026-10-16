-- Clube NPV: vitrine de prêmios em demonstração, fotos editáveis e pontos informativos.
-- Não ativa resgates: a coluna active continua controlando a compra por pontos.
ALTER TABLE public.clube_rewards
  ADD COLUMN IF NOT EXISTS showcase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_path text NOT NULL DEFAULT '';

-- Mostrar as cinco recompensas ilustrativas aos alunos aprovados, sem habilitar resgates.
UPDATE public.clube_rewards SET showcase=true
WHERE active=false AND name IN
 ('Camiseta NPV','Coqueteleira NPV','Kit snacks parceiro','Kit de hidratação','Benefício especial');

DROP POLICY IF EXISTS "clube_rewards_read_approved_or_admin" ON public.clube_rewards;
CREATE POLICY "clube_rewards_read_approved_or_admin" ON public.clube_rewards
FOR SELECT TO authenticated USING (
  ((active OR showcase) AND (SELECT public.clube_member_approved()))
  OR (SELECT public.clube_is_admin())
);

-- Valores ilustrativos até o proprietário aprovar a tabela oficial.
CREATE TABLE IF NOT EXISTS public.clube_point_rules (
  event_type text PRIMARY KEY CHECK (event_type IN ('renovacao','indicacao','foto','desafio','aniversario')),
  points integer NOT NULL CHECK (points BETWEEN 0 AND 100000),
  position integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.clube_point_rules(event_type,points,position) VALUES
  ('renovacao',100,1),('indicacao',150,2),('foto',30,3),
  ('desafio',50,4),('aniversario',80,5)
ON CONFLICT(event_type) DO NOTHING;

ALTER TABLE public.clube_point_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clube_point_rules_read_approved_or_admin" ON public.clube_point_rules;
CREATE POLICY "clube_point_rules_read_approved_or_admin" ON public.clube_point_rules
 FOR SELECT TO authenticated
 USING ((SELECT public.clube_member_approved()) OR (SELECT public.clube_is_admin()));
DROP POLICY IF EXISTS "clube_point_rules_admin_update" ON public.clube_point_rules;
CREATE POLICY "clube_point_rules_admin_update" ON public.clube_point_rules
 FOR UPDATE TO authenticated
 USING ((SELECT public.clube_is_admin()))
 WITH CHECK ((SELECT public.clube_is_admin()));
GRANT SELECT,UPDATE ON public.clube_point_rules TO authenticated;
REVOKE ALL ON public.clube_point_rules FROM anon;
REVOKE INSERT,DELETE ON public.clube_point_rules FROM authenticated;

-- Fotos de produtos: apenas JPEG/PNG/WebP até 4 MB. Download público apenas para imagens de catálogo.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('clube-npv-recompensas','clube-npv-recompensas',true,4194304,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public=true,file_size_limit=4194304,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "clube_npv_reward_image_admin_insert" ON storage.objects;
CREATE POLICY "clube_npv_reward_image_admin_insert" ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
   bucket_id='clube-npv-recompensas'
   AND (SELECT public.clube_is_admin())
 );
