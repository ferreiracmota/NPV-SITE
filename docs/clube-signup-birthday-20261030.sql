-- Migração aplicada em produção (Supabase) em 30/10/2026
-- Dia e mês apenas, sem ano, para lembrar do aniversário.
ALTER TABLE public.clube_profiles ADD COLUMN IF NOT EXISTS birthday_mmdd varchar(5);
ALTER TABLE public.clube_profiles ADD CONSTRAINT clube_profiles_birthday_mmdd_valid CHECK (
 birthday_mmdd IS NULL OR
 birthday_mmdd ~ '^(0[1-9]|1[0-9]|2[0-9]|3[01])-(01|03|05|07|08|10|12)$' OR
 birthday_mmdd ~ '^(0[1-9]|1[0-9]|2[0-9]|30)-(04|06|09|11)$' OR
 birthday_mmdd ~ '^(0[1-9]|1[0-9]|2[0-9])-(02)$'
);
CREATE OR REPLACE FUNCTION public.clube_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_birthday text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'birthday_mmdd','')),'');
 v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone','')),'');
BEGIN
 IF v_phone IS NOT NULL AND (length(v_phone)>24 OR v_phone !~ '^[+()0-9 -]+$' OR length(regexp_replace(v_phone,'[^0-9]','','g')) NOT BETWEEN 10 AND 15) THEN
  RAISE EXCEPTION 'Telefone inválido';
 END IF;
 INSERT INTO public.clube_profiles(id,full_name,email,approved,phone,birthday_mmdd)
 VALUES (new.id,left(coalesce(new.raw_user_meta_data ->> 'full_name',''),150),left(coalesce(new.email,''),320),false,v_phone,v_birthday);
 RETURN new;
END;
$function$;
-- Não alterar assinaturas Hotmart, pontuação, aprovação ou envios de e-mails.
