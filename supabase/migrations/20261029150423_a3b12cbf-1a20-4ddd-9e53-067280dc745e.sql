-- Profil: username unik + index user_id unik untuk join
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (username) WHERE username IS NOT NULL AND username <> '';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles (user_id);
GRANT SELECT ON public.profiles TO anon;

-- Tempat (dari Google Places atau pengajuan user)
CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  status text NOT NULL DEFAULT 'approved',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX places_name_idx ON public.places (lower(name));
GRANT SELECT ON public.places TO anon, authenticated;
GRANT INSERT, UPDATE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tempat dapat dilihat semua orang" ON public.places FOR SELECT USING (true);
CREATE POLICY "Pengguna login dapat mengusulkan tempat" ON public.places FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Pembuat dapat mengubah tempat usulannya" ON public.places FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Postingan
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_feed_cursor_idx ON public.posts (created_at DESC, id DESC);
CREATE INDEX posts_user_idx ON public.posts (user_id);
CREATE INDEX posts_place_idx ON public.posts (place_id);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Postingan tayang dapat dilihat semua orang" ON public.posts FOR SELECT USING ((status = 'published' AND deleted_at IS NULL) OR auth.uid() = user_id);
CREATE POLICY "Pengguna membuat postingan sendiri" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pengguna mengubah postingan sendiri" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pengguna menghapus postingan sendiri" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Like
CREATE TABLE public.post_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Like dapat dihitung semua orang" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Pengguna menambahkan like sendiri" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pengguna menghapus like sendiri" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Koleksi
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Koleksi milik pemilik" ON public.collections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.collection_posts (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.collection_posts TO authenticated;
GRANT ALL ON public.collection_posts TO service_role;
ALTER TABLE public.collection_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isi koleksi milik pemilik" ON public.collection_posts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

-- Laporan
CREATE TABLE public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pengguna melaporkan postingan" ON public.post_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Pengguna melihat laporannya sendiri" ON public.post_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Event
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_post_type_idx ON public.events (post_id, event_type);
GRANT INSERT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Semua orang dapat mencatat event" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Trigger updated_at untuk posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();