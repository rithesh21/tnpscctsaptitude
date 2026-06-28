
-- 1. Profile notification preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;

-- 2. News updates table
CREATE TABLE IF NOT EXISTS public.news_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_updates TO authenticated;
GRANT ALL ON public.news_updates TO service_role;

ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News readable by authenticated"
  ON public.news_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "News writable by admins"
  ON public.news_updates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "News updatable by admins"
  ON public.news_updates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "News deletable by admins"
  ON public.news_updates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_news_updates_updated_at
  BEFORE UPDATE ON public.news_updates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Saturday auto-scheduler
-- Picks the upcoming Saturday (today if it IS Saturday and no event exists yet)
-- and inserts a Main Test event for 10:00–12:00 IST (04:30–06:30 UTC) if missing.
CREATE OR REPLACE FUNCTION public.ensure_upcoming_saturday_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_date date;
  dow int;
  opens timestamptz;
  closes timestamptz;
  existing_id uuid;
  new_id uuid;
BEGIN
  -- ISO day of week: Monday=1 .. Sunday=7; Saturday = 6
  dow := EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int;
  IF dow = 6 THEN
    target_date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  ELSE
    target_date := ((now() AT TIME ZONE 'Asia/Kolkata')::date + ((6 - dow + 7) % 7));
  END IF;

  SELECT id INTO existing_id FROM public.main_test_events WHERE scheduled_date = target_date LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'created', false, 'event_id', existing_id, 'date', target_date);
  END IF;

  -- 10:00 IST = 04:30 UTC, 12:00 IST = 06:30 UTC
  opens  := (target_date::text || ' 04:30:00+00')::timestamptz;
  closes := (target_date::text || ' 06:30:00+00')::timestamptz;

  INSERT INTO public.main_test_events
    (scheduled_date, opens_at, closes_at, duration_minutes, new_question_ratio, repeat_question_ratio, status)
  VALUES
    (target_date, opens, closes, 30, 0.70, 0.30, 'scheduled')
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'created', true, 'event_id', new_id, 'date', target_date);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_upcoming_saturday_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_upcoming_saturday_event() TO service_role;
