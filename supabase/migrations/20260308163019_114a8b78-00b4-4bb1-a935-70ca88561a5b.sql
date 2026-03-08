
CREATE TABLE public.itinerary_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  travel_purpose text NOT NULL DEFAULT '',
  travel_purpose_other text,
  travel_companion text NOT NULL DEFAULT '',
  travel_companion_other text,
  travel_style text NOT NULL DEFAULT '',
  travel_style_other text,
  budget text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  duration_other text,
  destination text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (itinerary_id)
);

ALTER TABLE public.itinerary_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itinerary preferences"
  ON public.itinerary_preferences FOR SELECT
  TO authenticated
  USING (user_owns_itinerary(itinerary_id));

CREATE POLICY "Users can insert own itinerary preferences"
  ON public.itinerary_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_itinerary(itinerary_id));

CREATE POLICY "Users can update own itinerary preferences"
  ON public.itinerary_preferences FOR UPDATE
  TO authenticated
  USING (user_owns_itinerary(itinerary_id));

CREATE POLICY "Users can delete own itinerary preferences"
  ON public.itinerary_preferences FOR DELETE
  TO authenticated
  USING (user_owns_itinerary(itinerary_id));
