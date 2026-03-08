
CREATE TABLE public.itinerary_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text text NOT NULL DEFAULT '',
  suggestions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.itinerary_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.itinerary_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.itinerary_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
