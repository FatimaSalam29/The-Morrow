
-- Profiles with reading preferences
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  onboarded boolean NOT NULL DEFAULT false,
  topics text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  blocked_sources text[] NOT NULL DEFAULT '{}',
  reading_minutes integer NOT NULL DEFAULT 10,
  summary_style text NOT NULL DEFAULT 'balanced',
  edition_size integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Shared cache of real articles pulled from RSS feeds
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  image_url text,
  source text NOT NULL,
  category text NOT NULL,
  published_at timestamptz,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX articles_category_idx ON public.articles(category);
CREATE INDEX articles_published_idx ON public.articles(published_at DESC);
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read articles" ON public.articles FOR SELECT TO authenticated USING (true);

-- Daily editions
CREATE TABLE public.editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  edition_date date NOT NULL,
  edition_number integer NOT NULL DEFAULT 1,
  headline_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, edition_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editions TO authenticated;
GRANT ALL ON public.editions TO service_role;
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own editions" ON public.editions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own editions" ON public.editions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own editions" ON public.editions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own editions" ON public.editions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.edition_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL,
  section text NOT NULL,
  score double precision NOT NULL DEFAULT 0,
  reason text,
  UNIQUE (edition_id, article_id)
);
CREATE INDEX edition_articles_edition_idx ON public.edition_articles(edition_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edition_articles TO authenticated;
GRANT ALL ON public.edition_articles TO service_role;
ALTER TABLE public.edition_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own edition articles" ON public.edition_articles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own edition articles" ON public.edition_articles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own edition articles" ON public.edition_articles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reading signals
CREATE TABLE public.article_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('read','skip','like','save')),
  category text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id, action)
);
CREATE INDEX interactions_user_idx ON public.article_interactions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_interactions TO authenticated;
GRANT ALL ON public.article_interactions TO service_role;
ALTER TABLE public.article_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own interactions" ON public.article_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own interactions" ON public.article_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own interactions" ON public.article_interactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own interactions" ON public.article_interactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
