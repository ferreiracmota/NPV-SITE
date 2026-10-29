-- NPV: preferencias voluntarias de avisos e trilha de envio somente servidor.
CREATE TABLE IF NOT EXISTS public.clube_notification_preferences (
 student_id uuid PRIMARY KEY REFERENCES public.clube_profiles(id) ON DELETE CASCADE,
 reward_ready boolean NOT NULL DEFAULT false, new_reward boolean NOT NULL DEFAULT false,
 opted_in_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT clube_notification_prefs_optin CHECK (((reward_ready OR new_reward) AND opted_in_at IS NOT NULL) OR (NOT reward_ready AND NOT new_reward))
);
ALTER TABLE public.clube_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students see their own email preferences" ON public.clube_notification_preferences;
CREATE POLICY "Students see their own email preferences" ON public.clube_notification_preferences FOR SELECT TO authenticated USING ((select auth.uid()) = student_id);
DROP POLICY IF EXISTS "Students create their own email preferences" ON public.clube_notification_preferences;
CREATE POLICY "Students create their own email preferences" ON public.clube_notification_preferences FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = student_id);
DROP POLICY IF EXISTS "Students update their own email preferences" ON public.clube_notification_preferences;
CREATE POLICY "Students update their own email preferences" ON public.clube_notification_preferences FOR UPDATE TO authenticated USING ((select auth.uid()) = student_id) WITH CHECK ((select auth.uid()) = student_id);
GRANT SELECT,INSERT,UPDATE ON public.clube_notification_preferences TO authenticated;
REVOKE ALL ON public.clube_notification_preferences FROM anon;
CREATE TABLE IF NOT EXISTS public.clube_notification_deliveries (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id uuid NOT NULL REFERENCES public.clube_profiles(id) ON DELETE CASCADE,
 reward_id uuid NOT NULL REFERENCES public.clube_rewards(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('reward_ready','new_reward')),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','sent','error')),
 created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,error_code text,
 UNIQUE(student_id,reward_id,kind)
);
CREATE INDEX IF NOT EXISTS clube_notifications_delivery_student_idx ON public.clube_notification_deliveries(student_id,created_at DESC);
ALTER TABLE public.clube_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clube_notification_deliveries FROM PUBLIC,anon,authenticated;
