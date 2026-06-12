-- Ensure realtime on direct_messages so DM updates push in real time
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='direct_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages';
  END IF;
END $$;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- Allow admins to update/delete cofounder_requests too (so admin requests page can act)
DROP POLICY IF EXISTS "requests admin manage" ON public.cofounder_requests;
CREATE POLICY "requests admin manage" ON public.cofounder_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));