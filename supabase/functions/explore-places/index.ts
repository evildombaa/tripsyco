import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const categoryQueries: Record<string, string> = {
  Alam: "tempat wisata alam pemandangan",
  Kuliner: "restoran kuliner populer",
  Budaya: "tempat wisata budaya sejarah",
  Petualangan: "aktivitas outdoor petualangan wisata",
  Relaksasi: "spa resort relaksasi wellness",
};

function mapCategory(types: string[]): string {
  if (types.some((t) => ["restaurant", "food", "cafe", "bakery"].includes(t))) return "Kuliner";
  if (types.some((t) => ["spa", "lodging"].includes(t))) return "Relaksasi";
  if (types.some((t) => ["museum", "church", "hindu_temple", "place_of_worship"].includes(t))) return "Budaya";
  if (types.some((t) => ["park", "natural_feature", "campground"].includes(t))) return "Alam";
  if (types.some((t) => ["amusement_park", "stadium", "zoo", "aquarium"].includes(t))) return "Petualangan";
  return "Alam";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const { category, preferences, searchQuery } = await req.json();

    // Build search query based on preferences and category
    let q = "";
    if (searchQuery) {
      q = `wisata ${searchQuery} Indonesia`;
    } else {
      const prefPurpose = preferences?.travel_purpose || "";
      const prefActivity = preferences?.preferred_activity || "";
      const budget = preferences?.budget_preference || "";

      if (category && category !== "Semua") {
        q = `${categoryQueries[category] || "tempat wisata"} Indonesia`;
      } else if (prefPurpose || prefActivity) {
        q = `tempat wisata ${prefPurpose} ${prefActivity} Indonesia`.trim();
      } else {
        q = "tempat wisata populer Indonesia";
      }

      if (budget === "Premium") {
        q += " premium mewah";
      } else if (budget === "Hemat") {
        q += " murah gratis";
      }
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const places = (data.results || []).slice(0, 12).map((p: any) => {
      const photoRef = p.photos?.[0]?.photo_reference;
      const photoUrl = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`
        : null;

      return {
        name: p.name,
        address: p.formatted_address || p.vicinity || "",
        photoUrl,
        rating: p.rating || null,
        userRatingsTotal: p.user_ratings_total || null,
        category: mapCategory(p.types || []),
        placeId: p.place_id,
      };
    });

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-places error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
