
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard', 'very_hard');
CREATE TYPE public.test_unit AS ENUM ('I', 'II');
CREATE TYPE public.test_type AS ENUM ('practice', 'main');
CREATE TYPE public.test_status AS ENUM ('in_progress', 'submitted', 'expired');
CREATE TYPE public.main_event_status AS ENUM ('scheduled', 'open', 'closed', 'scored');
CREATE TYPE public.option_letter AS ENUM ('A', 'B', 'C', 'D');

-- =========================
-- updated_at helper
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  target_exam TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- user_roles
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + auto-promote first user to admin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- topics
-- =========================
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit public.test_unit NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO authenticated, anon;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select_all" ON public.topics FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "topics_admin_write" ON public.topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- questions
-- =========================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  difficulty public.difficulty_level NOT NULL,
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option public.option_letter NOT NULL,
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_topic_diff ON public.questions (topic_id, difficulty) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
-- Admins only — users never read questions directly; they go through server fns (service_role)
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- test_pattern_settings (singleton)
-- =========================
CREATE TABLE public.test_pattern_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  unit1_count INT NOT NULL DEFAULT 15,
  unit2_count INT NOT NULL DEFAULT 10,
  pct_easy INT NOT NULL DEFAULT 10,
  pct_medium INT NOT NULL DEFAULT 20,
  pct_hard INT NOT NULL DEFAULT 30,
  pct_very_hard INT NOT NULL DEFAULT 40,
  daily_practice_cap INT NOT NULL DEFAULT 10,
  main_test_new_ratio NUMERIC NOT NULL DEFAULT 0.70,
  main_test_repeat_ratio NUMERIC NOT NULL DEFAULT 0.30,
  main_test_duration_minutes INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.test_pattern_settings TO authenticated, anon;
GRANT ALL ON public.test_pattern_settings TO service_role;
ALTER TABLE public.test_pattern_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tps_select_all" ON public.test_pattern_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "tps_admin_update" ON public.test_pattern_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- tests
-- =========================
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type public.test_type NOT NULL,
  main_event_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_limit_seconds INT,
  total_time_seconds INT,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 25,
  status public.test_status NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tests_user ON public.tests (user_id, started_at DESC);
CREATE INDEX idx_tests_user_today ON public.tests (user_id, test_type, started_at);
GRANT SELECT, INSERT, UPDATE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests_select_own_or_admin" ON public.tests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================
-- test_questions
-- =========================
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  position INT NOT NULL,
  selected_option public.option_letter,
  is_correct BOOLEAN,
  time_spent_seconds INT DEFAULT 0,
  UNIQUE (test_id, position)
);
CREATE INDEX idx_tq_test ON public.test_questions (test_id);
GRANT SELECT, INSERT, UPDATE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tq_select_own_or_admin" ON public.test_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- =========================
-- user_seen_questions
-- =========================
CREATE TABLE public.user_seen_questions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, INSERT ON public.user_seen_questions TO authenticated;
GRANT ALL ON public.user_seen_questions TO service_role;
ALTER TABLE public.user_seen_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usq_select_own" ON public.user_seen_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =========================
-- main_test_events
-- =========================
CREATE TABLE public.main_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date DATE NOT NULL UNIQUE,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  new_question_ratio NUMERIC NOT NULL DEFAULT 0.70,
  repeat_question_ratio NUMERIC NOT NULL DEFAULT 0.30,
  duration_minutes INT NOT NULL DEFAULT 30,
  status public.main_event_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.main_test_events TO authenticated, anon;
GRANT ALL ON public.main_test_events TO service_role;
ALTER TABLE public.main_test_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mte_select_all" ON public.main_test_events FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "mte_admin_write" ON public.main_test_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.tests ADD CONSTRAINT tests_main_event_fk FOREIGN KEY (main_event_id) REFERENCES public.main_test_events(id) ON DELETE SET NULL;

-- =========================
-- leaderboard_entries
-- =========================
CREATE TABLE public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_event_id UUID NOT NULL REFERENCES public.main_test_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  time_taken_seconds INT NOT NULL,
  rank INT NOT NULL,
  percentile NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (main_event_id, user_id)
);
CREATE INDEX idx_lb_event_rank ON public.leaderboard_entries (main_event_id, rank);
GRANT SELECT ON public.leaderboard_entries TO authenticated, anon;
GRANT ALL ON public.leaderboard_entries TO service_role;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_select_all" ON public.leaderboard_entries FOR SELECT TO authenticated, anon USING (true);

-- =========================
-- question_reports
-- =========================
CREATE TABLE public.question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.question_reports TO authenticated;
GRANT UPDATE, DELETE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_insert_own" ON public.question_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "qr_select_own_or_admin" ON public.question_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "qr_admin_update" ON public.question_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- SEED: topics + default pattern
-- =========================
INSERT INTO public.topics (unit, name, slug, sort_order) VALUES
  ('I', 'Simplification', 'simplification', 1),
  ('I', 'Percentage', 'percentage', 2),
  ('I', 'HCF', 'hcf', 3),
  ('I', 'LCM', 'lcm', 4),
  ('I', 'Ratio & Proportion', 'ratio-proportion', 5),
  ('I', 'Simple Interest', 'simple-interest', 6),
  ('I', 'Compound Interest', 'compound-interest', 7),
  ('I', 'Area', 'area', 8),
  ('I', 'Volume', 'volume', 9),
  ('I', 'Time & Work', 'time-work', 10),
  ('II', 'Logical Reasoning', 'logical-reasoning', 11),
  ('II', 'Puzzles', 'puzzles', 12),
  ('II', 'Dice', 'dice', 13),
  ('II', 'Visual Reasoning', 'visual-reasoning', 14),
  ('II', 'Alpha-Numeric Reasoning', 'alpha-numeric-reasoning', 15),
  ('II', 'Number Series', 'number-series', 16);

INSERT INTO public.test_pattern_settings (id) VALUES (1);
