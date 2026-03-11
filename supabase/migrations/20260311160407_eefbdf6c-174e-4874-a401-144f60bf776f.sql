
-- Add budget to itineraries
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0;

-- Add location to itinerary_days  
ALTER TABLE public.itinerary_days ADD COLUMN IF NOT EXISTS location text DEFAULT '';

-- Add new fields to itinerary_day_items
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'want';
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS rating numeric;
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE public.itinerary_day_items ADD COLUMN IF NOT EXISTS estimated_cost numeric DEFAULT 0;
