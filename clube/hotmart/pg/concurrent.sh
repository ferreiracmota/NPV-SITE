#!/usr/bin/env bash
set -euo pipefail
# Apenas Postgres efêmero da CI. Não aponta para nenhum Supabase real.
if [ "$PGDATABASE" != "hotmart_ci" ]; then echo "Banco de teste não identificado"; exit 1; fi
psql -v ON_ERROR_STOP=1 <<'SQL'
SET request.jwt.claim.role='service_role';
UPDATE public.clube_hotmart_subscriptions SET link_status='linked'
 WHERE subscriber_code='SUB-TEST-A';
SELECT test.expect(
 public.clube_hotmart_ingest('evt-ci-one','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO',
 'HP-CONCORRENTE','SUB-TEST-A','aluno@example.invalid',10,7,now()-interval '1 hour',true)
 ='scheduled_pending_release','preparar pagamento concorrente');
SQL
psql -v ON_ERROR_STOP=1 -X -qAt -c "SET request.jwt.claim.role='service_role'; SELECT public.clube_hotmart_release_due(now());" > /tmp/npv-concurrent-a.log &
A=$!
psql -v ON_ERROR_STOP=1 -X -qAt -c "SET request.jwt.claim.role='service_role'; SELECT public.clube_hotmart_release_due(now());" > /tmp/npv-concurrent-b.log &
B=$!
wait "$A"
wait "$B"
psql -v ON_ERROR_STOP=1 <<'SQL'
SET request.jwt.claim.role='service_role';
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-CONCORRENTE' AND c.status='credited')=1,
 'duas execuções simultâneas liberam exatamente uma competência');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events e
 JOIN public.clube_hotmart_competencies c ON c.credit_event_id=e.id
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-CONCORRENTE')=1,'índice único evita crédito concorrente');
SQL
psql -v ON_ERROR_STOP=1 -X -qAt -c "SET request.jwt.claim.role='service_role'; SELECT public.clube_hotmart_ingest('evt-ci-hook','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO','HP-CONCORRENTE','SUB-TEST-A','aluno@example.invalid',10,7,now()-interval '1 hour',true);" > /tmp/npv-concurrent-hook.log &
A=$!
psql -v ON_ERROR_STOP=1 -X -qAt -c "SET request.jwt.claim.role='service_role'; SELECT public.clube_hotmart_ingest('evt-ci-reconcile','PURCHASE_APPROVED',1111111,'TESTE-EXCLUSIVO','HP-CONCORRENTE','SUB-TEST-A','aluno@example.invalid',10,7,now()-interval '1 hour',true);" > /tmp/npv-concurrent-reconcile.log &
B=$!
wait "$A"
wait "$B"
psql -v ON_ERROR_STOP=1 <<'SQL'
SET request.jwt.claim.role='service_role';
SELECT test.expect((SELECT count(*) FROM public.clube_hotmart_competencies c
 JOIN public.clube_hotmart_payments p ON p.id=c.payment_id
 WHERE p.transaction_id='HP-CONCORRENTE')=1,
 'webhook e conciliação não duplicam competência');
SELECT test.expect((SELECT count(*) FROM public.clube_point_events WHERE reference_id='legado-1')=1,
 'histórico legado não foi alterado');
SQL
echo "PASS: concorrência real de duas sessões PostgreSQL independentes"
