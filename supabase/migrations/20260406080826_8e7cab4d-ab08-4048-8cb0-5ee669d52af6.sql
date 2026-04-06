
CREATE TABLE public.itinerary_v2_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  destination text NOT NULL DEFAULT '',
  date_start date,
  date_end date,
  active_hours_start text DEFAULT '08:00',
  active_hours_end text DEFAULT '21:00',
  travel_purposes text[] DEFAULT '{}',
  travel_purpose_custom text,
  travel_companion text DEFAULT '',
  travel_companion_custom text,
  travel_style text DEFAULT '',
  travel_style_custom text,
  budget_range text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_v2_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own v2 preferences" ON public.itinerary_v2_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own v2 preferences" ON public.itinerary_v2_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own v2 preferences" ON public.itinerary_v2_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own v2 preferences" ON public.itinerary_v2_preferences FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_v2_preferences_updated_at BEFORE UPDATE ON public.itinerary_v2_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.itinerary_v2_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid NOT NULL REFERENCES public.itinerary_v2_preferences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  place_name text NOT NULL DEFAULT '',
  place_description text DEFAULT '',
  place_rating numeric,
  place_photo_url text,
  place_id text,
  place_address text,
  liked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_v2_swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own v2 swipes" ON public.itinerary_v2_swipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own v2 swipes" ON public.itinerary_v2_swipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own v2 swipes" ON public.itinerary_v2_swipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own v2 swipes" ON public.itinerary_v2_swipes FOR DELETE USING (auth.uid() = user_id);
