-- Executado somente na instância postgres efêmera do GitHub Actions.
CREATE SCHEMA test;
CREATE FUNCTION test.expect(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'TEST FAILED: %',message; END IF; END;$$;
SET request.jwt.claim.role='service_role';

INSERT INTO public.clube_hotmart_products(product_id,product_ucode,monthly_plan_ids,quarterly_plan_ids,enabled)
 VALUES(1111111,'TESTE-EXCLUSIVO',ARRAY[10]::bigint[],ARRAY[20]::bigint[],true);
INSERT INTO public.clube_hotmart_config(singleton,starts_at)
 VALUES(true,now()-interval '150 days')
 ON CONFLICT(singleton) DO UPDATE SET starts_at=excluded.starts_at;

SELECT test.expect((SELECT live_credit_enabled=false FROM public.clube_hotmart_config WHERE singleton),'kill switch off');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events)=1,'saldo histórico preservado');
SELECT test.expect(public.clube_hotmart_register_baseline(
 1111111,'SUB-TEST-A','aluno@example.invalid',10,30,
 now()-interval '100 days','TRANS-ANTIGA',now()+interval '15 days')
 ='linked_baseline_preserved','vínculo seguro no primeiro sync');
SELECT test.expect((SELECT baseline_at IS NOT NULL FROM public.clube_hotmart_subscriptions
 WHERE subscriber_code='SUB-TEST-A'),'baseline persistido');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events)=1,'primeiro sync não pontua');

SELECT test.expect(public.clube_hotmart_ingest(
 'evt-initial','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-INICIAL','SUB-TEST-A','aluno@example.invalid',10,1,now()-interval '7 days',true)
 ='initial_or_unconfirmed','compra inicial sem crédito');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-old','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-ANTIGA','SUB-TEST-A','aluno@example.invalid',10,2,now()-interval '110 days',true)
 ='before_first_sync','sem retroatividade');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-paid-1','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-MENSAL-1','SUB-TEST-A','aluno@example.invalid',10,3,now()-interval '1 day',true)
 ='scheduled_pending_release','mensal agendado');
SELECT test.expect(public.clube_hotmart_release_due(now())=0,'kill switch bloqueia mesmo com cobrança aprovada');
UPDATE public.clube_hotmart_config SET live_credit_enabled=true WHERE singleton;
SELECT test.expect(public.clube_hotmart_release_due(now())=1,'mensal pago concede uma competência');
SELECT test.expect((SELECT sum(points) FROM public.clube_point_events WHERE event_type='renovacao')=400,
 'mensal vale 400 pela regra');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-paid-duplicated','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-MENSAL-1','SUB-TEST-A','aluno@example.invalid',10,3,now()-interval '1 day',true)
 ='scheduled_pending_release','reenvio idempotente');
SELECT test.expect(public.clube_hotmart_release_due(now())=0,'reenvio não credita duas vezes');

-- Pagamento atrasado é atualizado com a confirmação na mesma transação.
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-late','PURCHASE_DELAYED',1111111,'TESTE-EXCLUSIVO',
 'HP-ATRASADO','SUB-TEST-A',NULL,10,4,NULL,false)
 ='delayed_no_credit','atraso não gera pontos');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-late-paid','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-ATRASADO','SUB-TEST-A','aluno@example.invalid',10,4,now()-interval '2 hours',true)
 ='scheduled_pending_release','atrasado pode ser aprovado');
SELECT test.expect(public.clube_hotmart_release_due(now())=1,'crédito somente após confirmação de atraso');

-- Três competências de assinatura TRIMESTRAL, sem antecipação.
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-quarter-1','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-1','SUB-TEST-A','aluno@example.invalid',20,5,now()-interval '5 days',true)
 ='scheduled_pending_release','primeira renovação trimestral programada');
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-TRIMESTRAL-1')=3,'três competências persistentes');
SELECT test.expect(public.clube_hotmart_release_due(now())=1,'somente primeira competência liberada');
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-TRIMESTRAL-1' AND c.status='scheduled')=2,
 'outras duas aguardam seus meses');
SELECT test.expect(public.clube_hotmart_release_due(now()+interval '40 days')=1,
 'segunda competência liberada depois de um mês');
SELECT test.expect(public.clube_hotmart_release_due(now()+interval '95 days')=1,
 'terceira competência liberada depois de dois meses');
SELECT test.expect(public.clube_hotmart_release_due(now()+interval '95 days')=0,
 'sem duplicidade após três competências');

-- Reembolso após crédito parcial: inverte apenas 400 já pagos e anula outras 2.
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-quarter-2','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-2','SUB-TEST-A','aluno@example.invalid',20,6,now()-interval '1 day',true)
 ='scheduled_pending_release','segunda renovação trimestral');
SELECT test.expect(public.clube_hotmart_release_due(now())=1,'primeira competência da segunda renovação');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-refund','PURCHASE_REFUNDED',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-2','SUB-TEST-A',NULL,20,6,NULL,false)
 ='refunded','reembolso efetiva estorno');
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-TRIMESTRAL-2' AND c.status='reversed')=1,
 'reembolso só reverte o que foi creditado');
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-TRIMESTRAL-2' AND c.status='void')=2,
 'duas futuras são anuladas');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-refund-duplicate','PURCHASE_REFUNDED',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-2','SUB-TEST-A',NULL,20,6,NULL,false)
 ='refunded','refund repetido permitido mas idempotente');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events WHERE reference_id LIKE 'hotmart:reverse:%')=1,
 'refund duplicado não cria outros estornos');
SELECT test.expect(public.clube_hotmart_release_due(now()+interval '180 days')=0,
 'compensações canceladas nunca vencem');

-- Chargeback de renovação de 3 competências já creditadas.
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-cb','PURCHASE_CHARGEBACK',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-1','SUB-TEST-A',NULL,20,5,NULL,false)
 ='chargeback','chargeback processado');
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-TRIMESTRAL-1' AND c.status='reversed')=3,
 'chargeback reverte cada competência creditada uma única vez');
SELECT test.expect((SELECT sum(points) FROM public.clube_point_events WHERE reference_id LIKE 'hotmart:reverse:%')=-1600,
 'reversão auditável 400+1200');
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-approval-out-of-order','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-TRIMESTRAL-1','SUB-TEST-A','aluno@example.invalid',20,5,now()-interval '5 days',true)
 ='terminal_preserved','aprovado atrasado não ressuscita chargeback');

-- Cancelamento apenas de assinatura não afeta as compras pagas.
SELECT test.expect(public.clube_hotmart_ingest(
 'evt-cancel-plan','SUBSCRIPTION_CANCELLATION',1111111,'TESTE-EXCLUSIVO',
 NULL,'SUB-TEST-A',NULL,20,NULL,NULL,false)
 ='subscription_cancelled_no_reversal','cancelamento não é estorno');
SELECT test.expect((SELECT points=500 FROM public.clube_point_events WHERE reference_id='legado-1'),
 'histórico anterior intocado');

-- Iniciações e papéis sem permissão não podem gravar.
SELECT test.expect(NOT has_function_privilege('authenticated',
 'public.clube_hotmart_release_due(timestamptz)','EXECUTE'),'RPC inacessível a aluno');
SELECT test.expect(NOT has_function_privilege('anon',
 'public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz,boolean)',
 'EXECUTE'),'RPC inacessível a anon');
SELECT test.expect(NOT has_table_privilege('authenticated','public.clube_hotmart_payments','SELECT'),
 'pagamentos privados por RLS/grants');
SELECT test.expect((SELECT relrowsecurity FROM pg_class WHERE oid='public.clube_hotmart_competencies'::regclass),
 'RLS competências ativo');
-- Plano inválido, conflito de email e segundo assinante não vinculam.
SELECT test.expect(public.clube_hotmart_register_baseline(
 1111111,'SUB-TEST-B','aluno@example.invalid',10,30,now()-interval '90 days')
 ='student_already_linked','um aluno não é vinculado silenciosamente a dois assinantes');
SELECT test.expect(public.clube_hotmart_register_baseline(
 1111111,'SUB-TEST-A','outro@example.invalid',10,30,now()-interval '50 days')
 ='identity_conflict','email divergente marcado como conflito');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events WHERE reference_id='legado-1')=1,
 'extrato anterior mantido após auditoria');
SELECT 'PASS: migration, RLS, mensal, trimestre, reembolso, chargeback, identidade e idempotência' AS result;
