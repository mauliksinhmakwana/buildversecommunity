
-- ============ PROFILES: extend ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS looking_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS creator_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_platforms jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User roles readable to authenticated" ON public.user_roles;
CREATE POLICY "User roles readable to authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ handle_new_user: profile + role (first=admin) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'member'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill roles for any existing users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
  CASE WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) = 1 AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin')
       THEN 'admin'::public.app_role ELSE 'member'::public.app_role END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;

-- ============ POSTS ============
DO $$ BEGIN
  CREATE TYPE public.post_type AS ENUM ('showcase','idea','streak','creator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.post_type NOT NULL,
  title text,
  body text NOT NULL,
  media_urls text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  validation_score int,
  validation_report jsonb,
  votes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable to all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts insert own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts update own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts delete own or admin" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.post_votes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_votes TO authenticated;
GRANT ALL ON public.post_votes TO service_role;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes readable" ON public.post_votes FOR SELECT USING (true);
CREATE POLICY "votes insert self" ON public.post_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes delete self" ON public.post_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "comments insert self" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments delete self or admin" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- XP + counts triggers
CREATE OR REPLACE FUNCTION public.posts_after_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    UPDATE public.profiles SET streak_days = (SELECT current_streak FROM public.streaks WHERE user_id = NEW.user_id), xp = xp + 20 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.votes_after_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET votes_count = votes_count + 1 WHERE id = NEW.post_id RETURNING user_id INTO author;
    UPDATE public.profiles SET xp = xp + 2 WHERE id = author;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.post_id RETURNING user_id INTO author;
    UPDATE public.profiles SET xp = GREATEST(0, xp - 2) WHERE id = author;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.comments_after_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  UPDATE public.profiles SET xp = xp + 5 WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

-- ============ STREAKS ============
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_post_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.streaks TO anon, authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks readable" ON public.streaks FOR SELECT USING (true);

DROP TRIGGER IF EXISTS posts_ai ON public.posts;
CREATE TRIGGER posts_ai AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.posts_after_insert();
DROP TRIGGER IF EXISTS votes_aiu ON public.post_votes;
CREATE TRIGGER votes_aiu AFTER INSERT OR DELETE ON public.post_votes FOR EACH ROW EXECUTE FUNCTION public.votes_after_change();
DROP TRIGGER IF EXISTS comments_ai ON public.post_comments;
CREATE TRIGGER comments_ai AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.comments_after_insert();

-- ============ COFOUNDER REQUESTS ============
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.cofounder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user, to_user)
);
GRANT SELECT, INSERT, UPDATE ON public.cofounder_requests TO authenticated;
GRANT ALL ON public.cofounder_requests TO service_role;
ALTER TABLE public.cofounder_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests visible to parties" ON public.cofounder_requests FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "requests insert from self" ON public.cofounder_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user AND from_user <> to_user);
CREATE POLICY "requests update recipient" ON public.cofounder_requests FOR UPDATE TO authenticated USING (auth.uid() = to_user) WITH CHECK (auth.uid() = to_user);

-- ============ DIRECT MESSAGES ============
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm visible to parties" ON public.direct_messages FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "dm insert if matched" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = from_user AND EXISTS (
    SELECT 1 FROM public.cofounder_requests r WHERE r.status = 'accepted'
      AND ((r.from_user = auth.uid() AND r.to_user = direct_messages.to_user)
        OR (r.to_user = auth.uid() AND r.from_user = direct_messages.to_user))
  )
);

-- ============ RESOURCES ============
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text,
  file_path text,
  category text NOT NULL DEFAULT 'general',
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable" ON public.resources FOR SELECT USING (true);
CREATE POLICY "resources insert auth" ON public.resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by AND (is_official = false OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "resources update own or admin" ON public.resources FOR UPDATE TO authenticated USING (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "resources delete own or admin" ON public.resources FOR DELETE TO authenticated USING (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'));

-- ============ HALL OF FAME ============
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_name text NOT NULL,
  challenge text NOT NULL,
  built_thing text NOT NULL,
  image_url text,
  year int,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hall_of_fame TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hall_of_fame TO authenticated;
GRANT ALL ON public.hall_of_fame TO service_role;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hof readable" ON public.hall_of_fame FOR SELECT USING (true);
CREATE POLICY "hof admin write" ON public.hall_of_fame FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "hof admin update" ON public.hall_of_fame FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "hof admin delete" ON public.hall_of_fame FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ GROUPS ============
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.groups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups readable auth" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups admin insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "groups admin update" ON public.groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "groups admin delete" ON public.groups FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm readable auth" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "gm self join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm self leave or admin" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachment_url text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gmsg read members" ON public.group_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_messages.group_id AND m.user_id = auth.uid())
);
CREATE POLICY "gmsg insert members" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_messages.group_id AND m.user_id = auth.uid())
);
CREATE POLICY "gmsg delete self or admin" ON public.group_messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ REALTIME ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cofounder_requests;
EXCEPTION WHEN duplicate_object THEN null; END $$;
