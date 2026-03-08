
CREATE TABLE public.onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  travel_purpose text NOT NULL DEFAULT '',
  travel_purpose_other text,
  preferred_activity text NOT NULL DEFAULT '',
  preferred_activity_other text,
  travel_style text NOT NULL DEFAULT '',
  travel_style_other text,
  local_interaction text NOT NULL DEFAULT '',
  budget_preference text NOT NULL DEFAULT '',
  travel_companion text NOT NULL DEFAULT '',
  travel_companion_other text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding" ON public.onboarding_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON public.onboarding_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON public.onboarding_responses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
