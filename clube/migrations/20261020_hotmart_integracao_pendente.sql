-- NPV | Hotmart -> Clube: migração PREPARATÓRIA, SEM ATIVAÇÃO.
-- Executar somente após revisão. Não credita, exclui ou altera pontuações históricas.
-- Fonte autorizada: Hotmart webhook 2.0 + API; escrita exclusiva da service_role.
BEGIN;

CREATE TABLE IF NOT EXISTS public.clube_hotmart_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 live_credit_enabled boolean NOT NULL DEFAULT false,
 starts_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT hotmart_credit_requires_policy CHECK
 (NOT live_credit_enabled OR starts_at IS NOT NULL)
);
INSERT INTO public.clube_hotmart_config(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.clube_hotmart_products (
 product_id bigint PRIMARY KEY CHECK(product_id > 0),
 product_ucode text NOT NULL,
 monthly_plan_ids bigint[] NOT NULL DEFAULT '{}',
 quarterly_plan_ids bigint[] NOT NULL DEFAULT '{}',
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clube_hotmart_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id bigint NOT NULL REFERENCES public.clube_hotmart_products(product_id),
 subscriber_code text NOT NULL CHECK(length(subscriber_code) BETWEEN 2 AND 128),
 subscriber_email text,
 student_id uuid REFERENCES public.clube_profiles(id),
 link_status text NOT NULL DEFAULT 'pending' CHECK(link_status IN('pending','linked','conflict')),
 hotmart_status text,
 plan_id bigint,
 period_days integer CHECK (period_days IN(30,90)),
 next_charge_at timestamptz,
 baseline_at timestamptz,
 baseline_transaction text,
 last_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,subscriber_code)
);
CREATE INDEX IF NOT EXISTS clube_hotmart_subscription_student_idx ON public.clube_hotmart_subscriptions(student_id);

CREATE TABLE IF NOT EXISTS public.clube_hotmart_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id bigint NOT NULL REFERENCES public.clube_hotmart_products(product_id),
 subscriber_code text NOT NULL,
 transaction_id text NOT NULL CHECK(length(transaction_id) BETWEEN 3 AND 160),
 plan_id bigint,
 recurrence_number integer,
 approved_at timestamptz,
 period_days integer CHECK(period_days IN (30,90)),
 purchase_verified boolean NOT NULL DEFAULT false,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','approved','delayed','cancelled','refunded','chargeback')),
 credit_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 reversal_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 processing_status text NOT NULL DEFAULT 'pending',
 reconciliation_checked_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,subscriber_code,transaction_id),
 UNIQUE(product_id,transaction_id), -- impede troca do assinante para a mesma transação
 FOREIGN KEY(product_id,subscriber_code)
   REFERENCES public.clube_hotmart_subscriptions(product_id,subscriber_code)
);
CREATE INDEX IF NOT EXISTS clube_hotmart_pending_idx ON public.clube_hotmart_payments(processing_status,updated_at);
CREATE TABLE IF NOT EXISTS public.clube_hotmart_webhook_events (
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 3 AND 160),
 event_type text NOT NULL,
 product_id bigint NOT NULL,
 transaction_id text,
 received_at timestamptz NOT NULL DEFAULT now(),
 processing_status text NOT NULL DEFAULT 'received'
);

-- Cursor independente por produto para conciliar assinaturas cujo webhook não chegou.
CREATE TABLE IF NOT EXISTS public.clube_hotmart_sync_state (
 product_id bigint PRIMARY KEY REFERENCES public.clube_hotmart_products(product_id),
 page_token text,
 last_checked_at timestamptz,
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clube_hotmart_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clube_hotmart_sync_state FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.clube_hotmart_sync_state TO service_role;

-- O kill switch começa desligado; sem teto global de pontuação.
-- Competências trimestrais persistentes são liberadas individualmente.

CREATE TABLE IF NOT EXISTS public.clube_hotmart_competencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payment_id uuid NOT NULL REFERENCES public.clube_hotmart_payments(id),
 ordinal smallint NOT NULL CHECK(ordinal BETWEEN 1 AND 3),
 due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'scheduled'
   CHECK(status IN ('scheduled','credited','reversed','void')),
 credit_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 reversal_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 credited_points integer CHECK(credited_points > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(payment_id,ordinal),
 CONSTRAINT clube_comp_credit_consistent CHECK(
   (status IN('credited','reversed') AND credit_event_id IS NOT NULL AND credited_points IS NOT NULL)
    OR (status IN('scheduled','void') AND credit_event_id IS NULL AND credited_points IS NULL)),
 CONSTRAINT clube_comp_reversal_consistent CHECK(
   (status='reversed' AND reversal_event_id IS NOT NULL)
   OR (status<>'reversed' AND reversal_event_id IS NULL))
);
CREATE INDEX IF NOT EXISTS clube_comp_due_idx
 ON public.clube_hotmart_competencies(status,due_at);
ALTER TABLE public.clube_hotmart_competencies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clube_hotmart_competencies FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.clube_hotmart_competencies TO service_role;

-- A autoria automatizada fica explicitamente NULL; eventos anteriores permanecem intactos.
-- O reference_id único + origem em note constituem trilha de auditoria.
ALTER TABLE public.clube_point_events ALTER COLUMN performed_by DROP NOT NULL;

ALTER TABLE public.clube_hotmart_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_hotmart_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_hotmart_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_hotmart_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_hotmart_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clube_hotmart_config, public.clube_hotmart_products,
 public.clube_hotmart_subscriptions, public.clube_hotmart_payments,
 public.clube_hotmart_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.clube_hotmart_config, public.clube_hotmart_products,
 public.clube_hotmart_subscriptions, public.clube_hotmart_payments,
 public.clube_hotmart_webhook_events TO service_role;


-- Vinculação e baseline: somente fonte Hotmart validada no servidor pode chamar.
-- A primeira sincronização NUNCA premia ou retroage.
CREATE OR REPLACE FUNCTION public.clube_hotmart_register_baseline(
 p_product_id bigint,p_subscriber_code text,p_verified_email text,
 p_plan_id bigint,p_period_days integer,p_first_seen_at timestamptz,
 p_last_transaction text DEFAULT NULL,p_next_charge_at timestamptz DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
DECLARE
 v_product public.clube_hotmart_products%rowtype;
 v_sub public.clube_hotmart_subscriptions%rowtype;
 v_student uuid; v_matches integer; v_email text;
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_only'; END IF;
 SELECT * INTO v_product FROM public.clube_hotmart_products WHERE product_id=p_product_id AND enabled;
 IF NOT FOUND OR p_first_seen_at IS NULL OR p_first_seen_at>now()+interval '5 minutes'
    OR coalesce(length(p_subscriber_code),0)<2
    OR NOT ((p_period_days=30 AND p_plan_id=ANY(v_product.monthly_plan_ids))
         OR (p_period_days=90 AND p_plan_id=ANY(v_product.quarterly_plan_ids)))
 THEN RETURN 'unverified_plan_or_baseline'; END IF;
 v_email:=nullif(lower(btrim(p_verified_email)),'');
 IF v_email IS NULL OR v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN RETURN 'invalid_email'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_product_id||':'||p_subscriber_code, 10));
 INSERT INTO public.clube_hotmart_subscriptions
   (product_id,subscriber_code,subscriber_email,plan_id,period_days,next_charge_at,
    baseline_at,baseline_transaction)
 VALUES(p_product_id,p_subscriber_code,v_email,p_plan_id,p_period_days,p_next_charge_at,
        p_first_seen_at,p_last_transaction)
 ON CONFLICT(product_id,subscriber_code) DO NOTHING;
 SELECT * INTO v_sub FROM public.clube_hotmart_subscriptions
 WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code FOR UPDATE;
 -- Webhook recebido antes da primeira sincronização cria assinatura sem email.
 -- Pode preencher a identidade apenas mediante consulta oficial autenticada.
 IF v_sub.subscriber_email IS NULL THEN
   UPDATE public.clube_hotmart_subscriptions SET
     subscriber_email=v_email,
     baseline_at=coalesce(baseline_at,p_first_seen_at),
     baseline_transaction=coalesce(baseline_transaction,p_last_transaction)
   WHERE id=v_sub.id;
   SELECT * INTO v_sub FROM public.clube_hotmart_subscriptions WHERE id=v_sub.id;
 END IF;
 IF v_sub.subscriber_email IS DISTINCT FROM v_email OR v_sub.link_status='conflict'
  OR (v_sub.student_id IS NOT NULL AND
     NOT EXISTS(SELECT 1 FROM auth.users u
       WHERE u.id=v_sub.student_id AND lower(u.email)=v_email AND u.email_confirmed_at IS NOT NULL))
 THEN
  UPDATE public.clube_hotmart_subscriptions SET link_status='conflict' WHERE id=v_sub.id;
  RETURN 'identity_conflict';
 END IF;
 SELECT count(*),(array_agg(p.id))[1] INTO v_matches,v_student
 FROM public.clube_profiles p JOIN auth.users u ON u.id=p.id
 WHERE p.approved AND u.email_confirmed_at IS NOT NULL
   AND lower(btrim(p.email))=v_email AND lower(btrim(u.email))=v_email;
 IF v_matches<>1 THEN
  UPDATE public.clube_hotmart_subscriptions SET
   link_status='pending',last_verified_at=now(),next_charge_at=p_next_charge_at,
   plan_id=p_plan_id,period_days=p_period_days WHERE id=v_sub.id;
  RETURN 'pending_identity';
 END IF;
 IF EXISTS(SELECT 1 FROM public.clube_hotmart_subscriptions s
  WHERE s.product_id=p_product_id AND s.student_id=v_student AND s.id<>v_sub.id
    AND s.link_status='linked') THEN
  UPDATE public.clube_hotmart_subscriptions SET link_status='conflict' WHERE id=v_sub.id;
  RETURN 'student_already_linked';
 END IF;
 UPDATE public.clube_hotmart_subscriptions SET
   student_id=v_student,link_status='linked',last_verified_at=now(),
   next_charge_at=p_next_charge_at,plan_id=p_plan_id,period_days=p_period_days
 WHERE id=v_sub.id AND (student_id IS NULL OR student_id=v_student);
 IF NOT FOUND THEN RETURN 'identity_conflict'; END IF;
 RETURN 'linked_baseline_preserved';
END
$func$;
REVOKE ALL ON FUNCTION public.clube_hotmart_register_baseline(bigint,text,text,bigint,integer,timestamptz,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clube_hotmart_register_baseline(bigint,text,text,bigint,integer,timestamptz,text,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.clube_hotmart_ingest(
 p_event_id text,p_event_type text,p_product_id bigint,p_product_ucode text,
 p_transaction text,p_subscriber_code text,p_verified_subscriber_email text,
 p_plan_id bigint,p_recurrence integer,p_approved_at timestamptz,p_purchase_verified boolean
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
DECLARE
 v_product public.clube_hotmart_products%rowtype;
 v_sub public.clube_hotmart_subscriptions%rowtype;
 v_pay public.clube_hotmart_payments%rowtype;
 v_comp public.clube_hotmart_competencies%rowtype;
 v_status text; v_period integer; v_first timestamptz;
 v_student uuid; v_pts integer; v_reversal uuid;
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_only'; END IF;
 IF p_event_id IS NULL OR length(p_event_id) NOT BETWEEN 3 AND 160
  OR p_event_type NOT IN('PURCHASE_APPROVED','PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK','PURCHASE_CANCELED','PURCHASE_DELAYED','SUBSCRIPTION_CANCELLATION')
 THEN RAISE EXCEPTION 'invalid_event'; END IF;
 SELECT * INTO v_product FROM public.clube_hotmart_products
 WHERE product_id=p_product_id AND enabled
 AND (product_ucode=p_product_ucode OR (p_event_type='SUBSCRIPTION_CANCELLATION'
 AND coalesce(p_product_ucode,'')=''));
 IF NOT FOUND THEN RETURN 'ignored_product'; END IF;
 INSERT INTO public.clube_hotmart_webhook_events(event_id,event_type,product_id,transaction_id)
 VALUES(p_event_id,p_event_type,p_product_id,p_transaction) ON CONFLICT DO NOTHING;
 IF p_event_type='SUBSCRIPTION_CANCELLATION' THEN
  UPDATE public.clube_hotmart_subscriptions SET hotmart_status='CANCELLED'
   WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code;
  RETURN 'subscription_cancelled_no_reversal';
 END IF;
 IF p_transaction IS NULL OR length(p_transaction) NOT BETWEEN 3 AND 160
  OR p_subscriber_code IS NULL OR length(p_subscriber_code) NOT BETWEEN 2 AND 128
 THEN RETURN 'pending_identifiers'; END IF;
 -- Chave de bloqueio NÃO inclui subscriber_code: não permite trocar titular da transação.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_product_id::text||':'||p_transaction,11));
 INSERT INTO public.clube_hotmart_subscriptions(product_id,subscriber_code)
 VALUES(p_product_id,p_subscriber_code) ON CONFLICT DO NOTHING;
 SELECT * INTO v_sub FROM public.clube_hotmart_subscriptions
  WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code FOR UPDATE;
 IF v_sub.subscriber_email IS NOT NULL
  AND p_verified_subscriber_email IS NOT NULL
  AND lower(btrim(p_verified_subscriber_email)) <> v_sub.subscriber_email THEN
  UPDATE public.clube_hotmart_subscriptions SET link_status='conflict' WHERE id=v_sub.id;
  RETURN 'identity_conflict';
 END IF;
 INSERT INTO public.clube_hotmart_payments
 (product_id,subscriber_code,transaction_id,plan_id,recurrence_number,approved_at)
 VALUES(p_product_id,p_subscriber_code,p_transaction,p_plan_id,p_recurrence,p_approved_at)
 ON CONFLICT(product_id,subscriber_code,transaction_id) DO NOTHING;
 SELECT * INTO v_pay FROM public.clube_hotmart_payments
 WHERE product_id=p_product_id AND transaction_id=p_transaction FOR UPDATE;
 IF v_pay.subscriber_code IS DISTINCT FROM p_subscriber_code
 OR (v_pay.plan_id IS NOT NULL AND p_plan_id IS NOT NULL AND v_pay.plan_id<>p_plan_id)
 OR (v_pay.recurrence_number IS NOT NULL AND p_recurrence IS NOT NULL
   AND v_pay.recurrence_number<>p_recurrence)
 THEN
  UPDATE public.clube_hotmart_payments SET processing_status='conflict' WHERE id=v_pay.id;
  RETURN 'payment_identity_or_plan_conflict';
 END IF;
 IF p_event_type IN ('PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED') THEN
  v_status:=CASE p_event_type WHEN 'PURCHASE_REFUNDED' THEN 'refunded'
    WHEN 'PURCHASE_CHARGEBACK' THEN 'chargeback' ELSE 'cancelled' END;
  UPDATE public.clube_hotmart_payments SET state=v_status,
    processing_status=v_status,updated_at=now() WHERE id=v_pay.id;
  FOR v_comp IN SELECT * FROM public.clube_hotmart_competencies
    WHERE payment_id=v_pay.id ORDER BY ordinal FOR UPDATE LOOP
    IF v_comp.status='scheduled' THEN
      UPDATE public.clube_hotmart_competencies SET status='void' WHERE id=v_comp.id;
    ELSIF v_comp.status='credited' THEN
      SELECT student_id,points INTO v_student,v_pts FROM public.clube_point_events
        WHERE id=v_comp.credit_event_id;
      INSERT INTO public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by)
        VALUES(v_student,'ajuste',-v_pts,'Estorno de competência Hotmart',
          'hotmart:reverse:'||v_comp.id::text,NULL)
      ON CONFLICT(reference_id) DO NOTHING RETURNING id INTO v_reversal;
      IF v_reversal IS NULL THEN
       SELECT id INTO v_reversal FROM public.clube_point_events
       WHERE reference_id='hotmart:reverse:'||v_comp.id::text;
      END IF;
      UPDATE public.clube_hotmart_competencies
        SET status='reversed',reversal_event_id=v_reversal WHERE id=v_comp.id;
      IF v_comp.ordinal=1 THEN
       UPDATE public.clube_hotmart_payments SET reversal_event_id=v_reversal WHERE id=v_pay.id;
      END IF;
    END IF;
  END LOOP;
  RETURN v_status;
 END IF;
 IF v_pay.state IN('refunded','chargeback','cancelled') THEN RETURN 'terminal_preserved'; END IF;
 IF p_event_type='PURCHASE_DELAYED' THEN
  IF v_pay.state<>'approved' THEN
   UPDATE public.clube_hotmart_payments SET state='delayed',processing_status='delayed'
   WHERE id=v_pay.id;
  END IF;
  RETURN 'delayed_no_credit';
 END IF;
 IF p_event_type<>'PURCHASE_APPROVED' THEN RETURN 'ignored_event'; END IF;
 IF p_plan_id=ANY(v_product.monthly_plan_ids) THEN v_period:=30;
 ELSIF p_plan_id=ANY(v_product.quarterly_plan_ids) THEN v_period:=90;
 ELSE RETURN 'unknown_plan'; END IF;
 IF p_approved_at IS NULL OR p_recurrence IS NULL OR p_recurrence<=1 THEN
  RETURN 'initial_or_unconfirmed'; END IF;
 IF p_purchase_verified IS DISTINCT FROM true THEN
  UPDATE public.clube_hotmart_payments SET processing_status='unverified'
  WHERE id=v_pay.id;
  RETURN 'pending_purchase_verification';
 END IF;
 UPDATE public.clube_hotmart_payments SET state='approved',purchase_verified=true,
  approved_at=p_approved_at,recurrence_number=p_recurrence,
  plan_id=p_plan_id,period_days=v_period,updated_at=now()
 WHERE id=v_pay.id;
 IF v_sub.link_status<>'linked' OR v_sub.student_id IS NULL OR v_sub.baseline_at IS NULL
 THEN RETURN 'pending_baseline_or_identity'; END IF;
 IF p_approved_at<=v_sub.baseline_at THEN RETURN 'before_first_sync'; END IF;
 SELECT starts_at INTO v_first FROM public.clube_hotmart_config WHERE singleton;
 IF v_first IS NULL OR p_approved_at<v_first THEN RETURN 'before_automation_start'; END IF;
 INSERT INTO public.clube_hotmart_competencies(payment_id,ordinal,due_at)
 SELECT v_pay.id, n, (p_approved_at+make_interval(months => n-1))
 FROM generate_series(1,CASE v_period WHEN 90 THEN 3 ELSE 1 END) n
 ON CONFLICT(payment_id,ordinal) DO NOTHING;
 UPDATE public.clube_hotmart_payments SET processing_status='scheduled' WHERE id=v_pay.id;
 RETURN 'scheduled_pending_release';
END
$func$;
REVOKE ALL ON FUNCTION public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz,boolean) TO service_role;

-- Executar periodicamente SOMENTE após homologação e autorização explícita.
-- Lançamento concorrente: lock em pagamento, depois perfil, depois competência.
-- O extrato mantém índices únicos pelo ID da competência.
CREATE OR REPLACE FUNCTION public.clube_hotmart_release_due(p_as_of timestamptz DEFAULT now())
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
DECLARE
 v_pay public.clube_hotmart_payments%rowtype;
 v_comp public.clube_hotmart_competencies%rowtype;
 v_student uuid; v_rule integer; v_credit uuid; v_count integer:=0;
 v_settings public.clube_hotmart_config%rowtype;
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_only'; END IF;
 SELECT * INTO v_settings FROM public.clube_hotmart_config WHERE singleton;
 IF NOT coalesce(v_settings.live_credit_enabled,false) OR v_settings.starts_at IS NULL
 THEN RETURN 0; END IF;
 SELECT points INTO v_rule FROM public.clube_point_rules WHERE event_type='renovacao';
 IF v_rule IS NULL OR v_rule<1 THEN RAISE EXCEPTION 'renovacao_rule_invalid'; END IF;
 FOR v_pay IN
  SELECT p.* FROM public.clube_hotmart_payments p
  WHERE p.state='approved' AND p.purchase_verified AND p.approved_at>=v_settings.starts_at
    AND EXISTS (SELECT 1 FROM public.clube_hotmart_competencies c
      WHERE c.payment_id=p.id AND c.status='scheduled' AND c.due_at<=p_as_of)
  ORDER BY p.approved_at,p.id FOR UPDATE OF p SKIP LOCKED LIMIT 100
 LOOP
  SELECT s.student_id INTO v_student FROM public.clube_hotmart_subscriptions s
  JOIN public.clube_profiles profile ON profile.id=s.student_id AND profile.approved
  WHERE s.product_id=v_pay.product_id AND s.subscriber_code=v_pay.subscriber_code
   AND s.link_status='linked' AND s.baseline_at IS NOT NULL
   AND v_pay.approved_at>s.baseline_at;
  IF v_student IS NULL THEN CONTINUE; END IF;
  PERFORM 1 FROM public.clube_profiles WHERE id=v_student AND approved FOR UPDATE;
  IF NOT FOUND THEN CONTINUE; END IF;
  FOR v_comp IN SELECT * FROM public.clube_hotmart_competencies
     WHERE payment_id=v_pay.id AND status='scheduled' AND due_at<=p_as_of
     ORDER BY ordinal FOR UPDATE
  LOOP
   INSERT INTO public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by)
   VALUES(v_student,'renovacao',v_rule,
    'Renovação Hotmart confirmada — +'||v_rule||' pontos ('||v_comp.ordinal||')',
    'hotmart:comp:'||v_comp.id::text,NULL)
   ON CONFLICT(reference_id) DO NOTHING RETURNING id INTO v_credit;
   IF v_credit IS NULL THEN
    SELECT id INTO v_credit FROM public.clube_point_events WHERE reference_id='hotmart:comp:'||v_comp.id::text;
   END IF;
   UPDATE public.clube_hotmart_competencies
     SET status='credited',credit_event_id=v_credit,credited_points=v_rule WHERE id=v_comp.id;
   IF v_comp.ordinal=1 THEN
    UPDATE public.clube_hotmart_payments SET credit_event_id=v_credit WHERE id=v_pay.id;
   END IF;
   v_count:=v_count+1;
  END LOOP;
  UPDATE public.clube_hotmart_payments SET processing_status='credited_or_partial'
    WHERE id=v_pay.id;
 END LOOP;
 RETURN v_count;
END
$func$;
REVOKE ALL ON FUNCTION public.clube_hotmart_release_due(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clube_hotmart_release_due(timestamptz) TO service_role;
COMMIT;
