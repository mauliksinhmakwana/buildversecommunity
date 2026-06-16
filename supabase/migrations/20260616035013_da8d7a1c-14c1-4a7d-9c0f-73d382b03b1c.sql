-- Participation fields
ALTER TABLE public.challenge_enrollments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'joined',
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.challenge_enrollments
  DROP CONSTRAINT IF EXISTS challenge_enrollments_status_check;
ALTER TABLE public.challenge_enrollments
  ADD CONSTRAINT challenge_enrollments_status_check CHECK (status IN ('joined','in_progress','completed'));
ALTER TABLE public.challenge_enrollments
  DROP CONSTRAINT IF EXISTS challenge_enrollments_progress_check;
ALTER TABLE public.challenge_enrollments
  ADD CONSTRAINT challenge_enrollments_progress_check CHECK (progress BETWEEN 0 AND 100);

DROP TRIGGER IF EXISTS enrollments_touch ON public.challenge_enrollments;
CREATE TRIGGER enrollments_touch BEFORE UPDATE ON public.challenge_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "enroll self update" ON public.challenge_enrollments;
CREATE POLICY "enroll self update" ON public.challenge_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif own read" ON public.notifications;
CREATE POLICY "notif own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notif own update" ON public.notifications;
CREATE POLICY "notif own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notif own delete" ON public.notifications;
CREATE POLICY "notif own delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- Co-founder request notification trigger
CREATE OR REPLACE FUNCTION public.cofounder_req_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.from_user;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.to_user, 'cofounder_request',
            COALESCE(sender_name, 'Someone') || ' sent you a connect request',
            NEW.message, '/app/cofounders/requests');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted','declined') THEN
    SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.to_user;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.from_user, 'cofounder_response',
            COALESCE(sender_name, 'They') || ' ' || NEW.status || ' your connect request',
            NULL,
            CASE WHEN NEW.status='accepted' THEN '/app/messages/' || NEW.to_user::text ELSE '/app/cofounders/requests' END);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cofounder_req_notify_ins ON public.cofounder_requests;
CREATE TRIGGER cofounder_req_notify_ins AFTER INSERT ON public.cofounder_requests
  FOR EACH ROW EXECUTE FUNCTION public.cofounder_req_notify();
DROP TRIGGER IF EXISTS cofounder_req_notify_upd ON public.cofounder_requests;
CREATE TRIGGER cofounder_req_notify_upd AFTER UPDATE ON public.cofounder_requests
  FOR EACH ROW EXECUTE FUNCTION public.cofounder_req_notify();