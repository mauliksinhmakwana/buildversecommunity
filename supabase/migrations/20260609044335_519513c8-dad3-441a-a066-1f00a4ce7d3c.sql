
-- Storage RLS for the 5 buckets. Path convention: <userId>/<filename>
DO $$ BEGIN
  -- READ: any signed-in user can read these buckets
  CREATE POLICY "panel buckets read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','post-media','resources','chat-attachments','hall-of-fame'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "panel buckets write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','post-media','resources','chat-attachments','hall-of-fame')
    AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "panel buckets update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','post-media','resources','chat-attachments','hall-of-fame')
    AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "panel buckets delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','post-media','resources','chat-attachments','hall-of-fame')
    AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;
