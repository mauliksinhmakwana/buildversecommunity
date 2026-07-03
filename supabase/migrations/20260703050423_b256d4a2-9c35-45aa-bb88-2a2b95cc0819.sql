
DROP POLICY IF EXISTS "enroll read" ON public.challenge_enrollments;
CREATE POLICY "enroll read" ON public.challenge_enrollments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "streaks readable" ON public.streaks;
CREATE POLICY "streaks readable" ON public.streaks FOR SELECT TO authenticated USING (true);

REVOKE EXECUTE ON FUNCTION public.cofounder_req_notify() FROM PUBLIC, anon, authenticated;
