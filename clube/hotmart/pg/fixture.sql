-- PostgreSQL 17 DESCARTÁVEL, sem Supabase remoto.
-- Simula apenas os objetos já existentes exigidos pela migração NPV.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
CREATE TABLE auth.users(
 id uuid PRIMARY KEY,
 email text NOT NULL,
 email_confirmed_at timestamptz
);
CREATE TABLE public.clube_profiles(
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 email text NOT NULL,
 approved boolean NOT NULL DEFAULT false
);
CREATE TABLE public.clube_point_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.clube_profiles(id),
 event_type text NOT NULL CHECK(event_type IN ('renovacao','indicacao','foto','desafio','aniversario','ajuste','resgate')),
 points integer NOT NULL CHECK(points BETWEEN -100000 AND 100000 AND points<>0),
 note text NOT NULL DEFAULT '',
 reference_id text UNIQUE,
 performed_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.clube_point_rules (
 event_type text PRIMARY KEY,
 points integer NOT NULL CHECK(points>0)
);
INSERT INTO auth.users VALUES
 ('10000000-0000-4000-8000-000000000001','aluno@example.invalid',now()-interval '200 days'),
 ('10000000-0000-4000-8000-000000000002','admin@example.invalid',now()-interval '200 days'),
 ('10000000-0000-4000-8000-000000000003','pendente@example.invalid',NULL);
INSERT INTO public.clube_profiles VALUES
 ('10000000-0000-4000-8000-000000000001','aluno@example.invalid',true),
 ('10000000-0000-4000-8000-000000000002','admin@example.invalid',true),
 ('10000000-0000-4000-8000-000000000003','pendente@example.invalid',false);
INSERT INTO public.clube_point_rules VALUES('renovacao',400);
-- Lançamento legado realista: jamais alterado pelos scripts Hotmart.
INSERT INTO public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by)
 VALUES('10000000-0000-4000-8000-000000000001','foto',500,'Saldo antigo','legado-1',
 '10000000-0000-4000-8000-000000000002');
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
GRANT SELECT ON public.clube_point_events TO authenticated;
ALTER TABLE public.clube_point_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY clube_points_read_approved ON public.clube_point_events
 FOR SELECT TO authenticated USING(student_id = '10000000-0000-4000-8000-000000000001'::uuid);
REVOKE INSERT,UPDATE,DELETE ON public.clube_point_events FROM anon,authenticated;
