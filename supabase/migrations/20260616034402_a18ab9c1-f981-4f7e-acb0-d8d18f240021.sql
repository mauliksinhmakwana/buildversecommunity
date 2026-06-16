DROP POLICY IF EXISTS "dm insert if matched" ON public.direct_messages;
CREATE POLICY "dm insert by sender" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = from_user AND from_user <> to_user);