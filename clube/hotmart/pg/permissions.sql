-- Rodar em PostgreSQL isolado, após a migração e cenários.
SET ROLE authenticated;
SET request.jwt.claim.role='authenticated';
DO $$
BEGIN
 BEGIN
  PERFORM public.clube_hotmart_release_due(now());
  RAISE EXCEPTION 'FAIL: authenticated executed release_due';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM product_id FROM public.clube_hotmart_payments LIMIT 1;
  RAISE EXCEPTION 'FAIL: authenticated read private payments';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.clube_hotmart_competencies(payment_id,ordinal,due_at)
  VALUES(gen_random_uuid(),1,now());
  RAISE EXCEPTION 'FAIL: authenticated inserted private competency';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE anon;
SET request.jwt.claim.role='anon';
DO $$
BEGIN
 BEGIN
  PERFORM public.clube_hotmart_register_baseline(
    1111111,'SUB-TEST-X','fake@example.invalid',10,30,now(),NULL,NULL);
  RAISE EXCEPTION 'FAIL: anonymous registered baseline';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: permissão efetiva: authenticated/anon não acessam RPCs ou tabelas' AS result;
