
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cofounder_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS member_role text NOT NULL DEFAULT 'member';

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.posts_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET xp = xp + 10, updated_at = now() WHERE id = NEW.user_id;
  IF NEW.type = 'streak' THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_post_date)
    VALUES (NEW.user_id, 1, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak = CASE
        WHEN public.streaks.last_post_date = CURRENT_DATE THEN public.streaks.current_streak
        WHEN public.streaks.last_post_date = CURRENT_DATE - 1 THEN public.streaks.current_streak + 1
        ELSE 1 END,
      longest_streak = GREATEST(public.streaks.longest_streak, CASE
        WHEN public.streaks.last_post_date = CURRENT_DATE - 1 THEN public.streaks.current_streak + 1
        WHEN public.streaks.last_post_date = CURRENT_DATE THEN public.streaks.current_streak
        ELSE 1 END),
      last_post_date = CURRENT_DATE;
    UPDATE public.profiles SET streak_days = (SELECT current_streak FROM public.streaks WHERE user_id = NEW.user_id) WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','past')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges public read" ON public.challenges;
DROP POLICY IF EXISTS "challenges admin write" ON public.challenges;
CREATE POLICY "challenges public read" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges admin write" ON public.challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS challenges_touch ON public.challenges;
CREATE TRIGGER challenges_touch BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.challenge_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.challenge_enrollments TO authenticated;
GRANT SELECT ON public.challenge_enrollments TO anon;
GRANT ALL ON public.challenge_enrollments TO service_role;
ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enroll read" ON public.challenge_enrollments;
DROP POLICY IF EXISTS "enroll self insert" ON public.challenge_enrollments;
DROP POLICY IF EXISTS "enroll self delete" ON public.challenge_enrollments;
CREATE POLICY "enroll read" ON public.challenge_enrollments FOR SELECT USING (true);
CREATE POLICY "enroll self insert" ON public.challenge_enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "enroll self delete" ON public.challenge_enrollments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.challenge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_requests TO authenticated;
GRANT ALL ON public.challenge_requests TO service_role;
ALTER TABLE public.challenge_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creq owner read" ON public.challenge_requests;
DROP POLICY IF EXISTS "creq insert self" ON public.challenge_requests;
DROP POLICY IF EXISTS "creq admin update" ON public.challenge_requests;
CREATE POLICY "creq owner read" ON public.challenge_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "creq insert self" ON public.challenge_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "creq admin update" ON public.challenge_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS creq_touch ON public.challenge_requests;
CREATE TRIGGER creq_touch BEFORE UPDATE ON public.challenge_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.challenge_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.challenge_requests(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.challenge_request_messages TO authenticated;
GRANT ALL ON public.challenge_request_messages TO service_role;
ALTER TABLE public.challenge_request_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm read" ON public.challenge_request_messages;
DROP POLICY IF EXISTS "crm insert" ON public.challenge_request_messages;
CREATE POLICY "crm read" ON public.challenge_request_messages FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.challenge_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
);
CREATE POLICY "crm insert" ON public.challenge_request_messages FOR INSERT TO authenticated WITH CHECK (
  from_user = auth.uid() AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.challenge_requests r WHERE r.id = request_id AND r.user_id = auth.uid()))
);

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='challenges';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='challenge_enrollments';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_enrollments; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='challenge_request_messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_request_messages; END IF;
END $$;
