DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "User roles readable to authenticated" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "panel buckets read auth" ON storage.objects;
CREATE POLICY "panel buckets read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = ANY (ARRAY['avatars','post-media','resources','chat-attachments','hall-of-fame'])
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.votes_after_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.comments_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.posts_after_insert() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;