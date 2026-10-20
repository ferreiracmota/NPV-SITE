-- NPV | Hotmart -> Clube: migração PREPARATÓRIA, SEM ATIVAÇÃO.
-- Executar somente após revisão. Não credita, exclui ou altera pontuações históricas.
-- Fonte autorizada: Hotmart webhook 2.0 + API; escrita exclusiva da service_role.
BEGIN;

CREATE TABLE IF NOT EXISTS public.clube_hotmart_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 live_credit_enabled boolean NOT NULL DEFAULT false,
 starts_at timestamptz,
 regular_monthly_limit integer CHECK (regular_monthly_limit BETWEEN 1 AND 100000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT hotmart_credit_requires_policy CHECK
 (NOT live_credit_enabled OR (starts_at IS NOT NULL AND regular_monthly_limit IS NOT NULL))
);
INSERT INTO public.clube_hotmart_config(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.clube_hotmart_products (
 product_id bigint PRIMARY KEY CHECK(product_id > 0),
 product_ucode text NOT NULL,
 monthly_plan_ids bigint[] NOT NULL DEFAULT '{}',
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
 state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','approved','delayed','cancelled','refunded','chargeback')),
 credit_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 reversal_event_id uuid UNIQUE REFERENCES public.clube_point_events(id),
 processing_status text NOT NULL DEFAULT 'pending',
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,subscriber_code,transaction_id),
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

CREATE OR REPLACE FUNCTION public.clube_hotmart_ingest(
 p_event_id text, p_event_type text, p_product_id bigint,
 p_product_ucode text, p_transaction text, p_subscriber_code text,
 p_verified_subscriber_email text, p_plan_id bigint,
 p_recurrence integer, p_approved_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
 v_product public.clube_hotmart_products%rowtype;
 v_config public.clube_hotmart_config%rowtype;
 v_subscription public.clube_hotmart_subscriptions%rowtype;
 v_payment public.clube_hotmart_payments%rowtype;
 v_student uuid;
 v_count integer;
 v_points integer;
 v_used integer;
 v_credit uuid;
 v_reversal uuid;
 v_email text;
 v_terminal text;
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Apenas service_role'; END IF;
 IF p_event_id IS NULL OR length(p_event_id) NOT BETWEEN 3 AND 160
    OR p_event_type NOT IN('PURCHASE_APPROVED','PURCHASE_REFUNDED',
      'PURCHASE_CHARGEBACK','PURCHASE_CANCELED','PURCHASE_DELAYED',
      'SUBSCRIPTION_CANCELLATION')
 THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 SELECT * INTO v_product FROM public.clube_hotmart_products
  WHERE product_id=p_product_id AND enabled AND product_ucode=p_product_ucode;
 IF NOT FOUND THEN RETURN 'ignored_product'; END IF;
 INSERT INTO public.clube_hotmart_webhook_events(event_id,event_type,product_id,transaction_id)
 VALUES(p_event_id,p_event_type,p_product_id,p_transaction)
 ON CONFLICT (event_id) DO NOTHING;
 IF p_event_type='SUBSCRIPTION_CANCELLATION' THEN
   UPDATE public.clube_hotmart_subscriptions SET hotmart_status='CANCELLED'
   WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code;
   UPDATE public.clube_hotmart_webhook_events SET processing_status='subscription_cancelled'
   WHERE event_id=p_event_id;
   RETURN 'subscription_cancelled_no_reversal';
 END IF;
 IF p_transaction IS NULL OR length(p_transaction) NOT BETWEEN 3 AND 160
  OR p_subscriber_code IS NULL OR length(p_subscriber_code) NOT BETWEEN 2 AND 128
 THEN RETURN 'pending_identifiers'; END IF;

 -- Serializa eventos concorrentes para a MESMA assinatura e transação.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_product_id::text||':'||p_subscriber_code||':'||p_transaction,0)
 );
 INSERT INTO public.clube_hotmart_subscriptions(product_id,subscriber_code)
 VALUES(p_product_id,p_subscriber_code) ON CONFLICT DO NOTHING;
 SELECT * INTO v_subscription FROM public.clube_hotmart_subscriptions
 WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code FOR UPDATE;

 -- Nunca vincular alguém com base no e-mail do comprador ou em dado livre.
 -- p_verified_subscriber_email só pode vir de consulta autenticada à API oficial.
 v_email:=nullif(lower(btrim(p_verified_subscriber_email)),'');
 IF v_email IS NOT NULL THEN
  IF v_subscription.subscriber_email IS NOT NULL
   AND v_subscription.subscriber_email <> v_email THEN
   UPDATE public.clube_hotmart_subscriptions SET link_status='conflict'
   WHERE id=v_subscription.id;
  ELSIF v_subscription.link_status <> 'conflict' THEN
   SELECT count(*),min(p.id) INTO v_count,v_student
   FROM public.clube_profiles p
   JOIN auth.users u ON u.id=p.id
   WHERE p.approved AND u.email_confirmed_at IS NOT NULL
     AND lower(btrim(u.email))=v_email
     AND lower(btrim(p.email))=v_email;
   IF v_count=1 AND (v_subscription.student_id IS NULL OR v_subscription.student_id=v_student) THEN
    UPDATE public.clube_hotmart_subscriptions
    SET student_id=v_student,subscriber_email=v_email,link_status='linked',last_verified_at=now()
    WHERE id=v_subscription.id;
   ELSIF v_subscription.student_id IS NULL THEN
    UPDATE public.clube_hotmart_subscriptions
    SET subscriber_email=v_email,link_status='pending',last_verified_at=now()
    WHERE id=v_subscription.id;
   END IF;
  END IF;
 END IF;
 SELECT * INTO v_subscription FROM public.clube_hotmart_subscriptions WHERE id=v_subscription.id;

 INSERT INTO public.clube_hotmart_payments
  (product_id,subscriber_code,transaction_id,plan_id,recurrence_number,approved_at)
 VALUES(p_product_id,p_subscriber_code,p_transaction,p_plan_id,p_recurrence,p_approved_at)
 ON CONFLICT (product_id,subscriber_code,transaction_id) DO NOTHING;
 SELECT * INTO v_payment FROM public.clube_hotmart_payments
 WHERE product_id=p_product_id AND subscriber_code=p_subscriber_code
 AND transaction_id=p_transaction FOR UPDATE;

 IF v_payment.plan_id IS NOT NULL AND p_plan_id IS NOT NULL AND v_payment.plan_id<>p_plan_id THEN
  UPDATE public.clube_hotmart_payments SET processing_status='plan_conflict' WHERE id=v_payment.id;
  RETURN 'plan_conflict';
 END IF;
 IF p_event_type IN('PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED') THEN
  v_terminal:=CASE p_event_type WHEN 'PURCHASE_REFUNDED' THEN 'refunded'
    WHEN 'PURCHASE_CHARGEBACK' THEN 'chargeback' ELSE 'cancelled' END;
  UPDATE public.clube_hotmart_payments SET state=v_terminal,processing_status=v_terminal,
    updated_at=now() WHERE id=v_payment.id;
  IF v_payment.credit_event_id IS NOT NULL AND v_payment.reversal_event_id IS NULL THEN
   SELECT student_id,points INTO v_student,v_points FROM public.clube_point_events
    WHERE id=v_payment.credit_event_id;
   -- Não apaga crédito, resgate ou histórico: estorno assinado, até saldo negativo.
   INSERT INTO public.clube_point_events(student_id,event_type,points,note,reference_id,performed_by)
   VALUES(v_student,'ajuste',-v_points,'Estorno automático Hotmart: '||p_transaction,
       'hotmart:reversal:'||v_payment.id::text,NULL)
   ON CONFLICT(reference_id) DO UPDATE SET reference_id=excluded.reference_id
   RETURNING id INTO v_reversal;
   UPDATE public.clube_hotmart_payments SET reversal_event_id=v_reversal WHERE id=v_payment.id;
  END IF;
  UPDATE public.clube_hotmart_webhook_events SET processing_status=v_terminal WHERE event_id=p_event_id;
  RETURN v_terminal;
 END IF;
 IF v_payment.state IN('refunded','chargeback','cancelled') THEN RETURN 'terminal_preserved'; END IF;
 IF p_event_type='PURCHASE_DELAYED' THEN
   IF v_payment.state<>'approved' THEN
     UPDATE public.clube_hotmart_payments SET state='delayed',processing_status='delayed',
     updated_at=now() WHERE id=v_payment.id;
   END IF;
   RETURN 'delayed_no_credit';
 END IF;
 IF p_event_type<>'PURCHASE_APPROVED' THEN RETURN 'ignored_event'; END IF;
 IF v_payment.credit_event_id IS NOT NULL THEN RETURN 'already_credited'; END IF;
 UPDATE public.clube_hotmart_payments SET
  state='approved',plan_id=coalesce(v_payment.plan_id,p_plan_id),
  recurrence_number=coalesce(v_payment.recurrence_number,p_recurrence),
  approved_at=coalesce(v_payment.approved_at,p_approved_at),updated_at=now()
 WHERE id=v_payment.id;
 SELECT * INTO v_config FROM public.clube_hotmart_config WHERE singleton;
 IF NOT v_config.live_credit_enabled OR v_config.starts_at IS NULL THEN
  UPDATE public.clube_hotmart_payments SET processing_status='disabled' WHERE id=v_payment.id;
  RETURN 'disabled';
 END IF;
 IF p_approved_at IS NULL OR p_approved_at < v_config.starts_at THEN RETURN 'before_start'; END IF;
 IF p_recurrence IS NULL OR p_recurrence<=1 THEN RETURN 'initial_not_renewal'; END IF;
 IF p_plan_id IS NULL OR NOT (p_plan_id=ANY(v_product.monthly_plan_ids)) THEN
  RETURN 'non_monthly_requires_approval';
 END IF;
 IF v_subscription.link_status<>'linked' OR v_subscription.student_id IS NULL THEN RETURN 'pending_identity'; END IF;
 IF v_config.regular_monthly_limit IS NULL THEN RETURN 'pending_cap_configuration'; END IF;
 SELECT points INTO v_points FROM public.clube_point_rules WHERE event_type='renovacao';
 IF v_points IS NULL OR v_points<1 THEN RETURN 'invalid_point_rule'; END IF;
 -- Mesmo lock do saldo usado pelas operações originais do Clube.
 PERFORM 1 FROM public.clube_profiles WHERE id=v_subscription.student_id AND approved FOR UPDATE;
 IF NOT FOUND THEN RETURN 'pending_approval'; END IF;
 SELECT coalesce(sum(greatest(points,0)),0) INTO v_used
 FROM public.clube_point_events
 WHERE student_id=v_subscription.student_id AND
 created_at>=date_trunc('month',now()) AND created_at<date_trunc('month',now())+interval '1 month'
 AND event_type NOT IN('indicacao','ajuste','resgate');
 IF v_used+v_points>v_config.regular_monthly_limit THEN RETURN 'regular_cap_reached'; END IF;
 INSERT INTO public.clube_point_events
   (student_id,event_type,points,note,reference_id,performed_by)
 VALUES(v_subscription.student_id,'renovacao',v_points,
   'Renovação Hotmart confirmada — +'||v_points||' pontos',
   'hotmart:credit:'||v_payment.id::text,NULL)
 ON CONFLICT(reference_id) DO UPDATE SET reference_id=excluded.reference_id
 RETURNING id INTO v_credit;
 UPDATE public.clube_hotmart_payments
 SET credit_event_id=v_credit,processing_status='credited' WHERE id=v_payment.id;
 UPDATE public.clube_hotmart_webhook_events SET processing_status='credited' WHERE event_id=p_event_id;
 RETURN 'credited';
END
$function$;
REVOKE ALL ON FUNCTION public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz)
 TO service_role;
COMMENT ON FUNCTION public.clube_hotmart_ingest(text,text,bigint,text,text,text,text,bigint,integer,timestamptz)
 IS 'Função exclusiva de servidor; idempotência transacional; ativação explicitamente bloqueada por padrão.';
COMMIT;
