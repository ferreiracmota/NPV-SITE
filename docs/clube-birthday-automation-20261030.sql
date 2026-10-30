-- NPV — aniversário automático, migração aplicada no Supabase em 30/10/2026.
-- Não alterar pontos anteriores nem o estado dos modelos já salvos.
ALTER TABLE public.clube_profiles ADD COLUMN IF NOT EXISTS birthday_exstudent_opt_in boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.clube_birthday_free_access (
 student_id uuid PRIMARY KEY REFERENCES public.clube_profiles(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clube_birthday_free_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clube_birthday_free_access FROM public,anon,authenticated;
GRANT ALL ON public.clube_birthday_free_access TO service_role;

CREATE OR REPLACE FUNCTION public.clube_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_birthday text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'birthday_mmdd','')),'');
 v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone','')),'');
 v_opt_in boolean := coalesce(new.raw_user_meta_data ->> 'birthday_exstudent_opt_in','false')='true';
BEGIN
 IF v_phone IS NOT NULL AND (length(v_phone)>24 OR v_phone !~ '^[+()0-9 -]+$' OR length(regexp_replace(v_phone,'[^0-9]','','g')) NOT BETWEEN 10 AND 15)
 THEN RAISE EXCEPTION 'Telefone inválido'; END IF;
 INSERT INTO public.clube_profiles(id,full_name,email,approved,phone,birthday_mmdd,birthday_exstudent_opt_in)
 VALUES (new.id,left(coalesce(new.raw_user_meta_data ->> 'full_name',''),150),
  left(coalesce(new.email,''),320),false,v_phone,v_birthday,v_opt_in);
 RETURN new;
END;
$function$

CREATE OR REPLACE FUNCTION public.clube_credit_birthday_once(p_student_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_today date := (now() at time zone 'America/Sao_Paulo')::date;
 v_year integer := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
 v_mmdd text := to_char((now() at time zone 'America/Sao_Paulo')::date,'DD-MM');
 v_profile public.clube_profiles%rowtype;
 v_points int;
 v_reference text;
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Permissão negada'; END IF;
 SELECT * INTO v_profile FROM public.clube_profiles WHERE id=p_student_id AND approved=true FOR UPDATE;
 IF NOT FOUND THEN RETURN 'ineligible'; END IF;
 IF v_profile.birthday_mmdd IS NULL OR (v_profile.birthday_mmdd <> v_mmdd AND
   NOT (v_profile.birthday_mmdd='29-02' AND v_mmdd='28-02' AND
        extract(day from make_date(v_year,3,1)-interval '1 day')=28))
 THEN RETURN 'wrong_day'; END IF;
 SELECT points INTO v_points FROM public.clube_point_rules WHERE event_type='aniversario';
 IF v_points IS DISTINCT FROM 100 THEN RETURN 'rule_unavailable'; END IF;
 IF EXISTS(
   SELECT 1 FROM public.clube_point_events e
   WHERE e.student_id=p_student_id AND e.event_type='aniversario' AND e.is_test IS NOT TRUE
     AND extract(year from (e.created_at at time zone 'America/Sao_Paulo'))=v_year
 ) THEN RETURN 'already_awarded'; END IF;
 v_reference:='birthday:auto:'||v_year||':'||p_student_id::text;
 INSERT INTO public.clube_point_events(student_id,event_type,points,note,reference_id,is_test)
 VALUES(p_student_id,'aniversario',100,'Aniversário — presente anual automático do Clube NPV',
   v_reference,false);
 RETURN 'credited';
END;
$function$

REVOKE ALL ON FUNCTION public.clube_credit_birthday_once(uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clube_credit_birthday_once(uuid) TO service_role;
-- Os tipos de envio já foram ampliados para incluir birthday_inactive.
