
ALTER TABLE public.itinerary_preferences 
  ADD COLUMN IF NOT EXISTS daily_hours_start text DEFAULT '',
  ADD COLUMN IF NOT EXISTS daily_hours_end text DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_purposes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS budget_tier text DEFAULT '';
