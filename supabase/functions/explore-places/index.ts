import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fallbackPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", photoUrl: null, rating: 4.6, userRatingsTotal: 48200, category: "Budaya", placeId: "ChIJm8w2en1G0i0RMBqEbF1fRfU" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", photoUrl: null, rating: 4.5, userRatingsTotal: 32100, category: "Alam", placeId: "ChIJW2v5bKxJ0i0RhKMb3387bKk" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 65000, category: "Budaya", placeId: "ChIJf-UWJaBYei4RSwIBbwVfJaE" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", placeId: "ChIJK2FPsINb1y0R7qqn1sXQHLw" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", photoUrl: null, rating: 4.8, userRatingsTotal: 12000, category: "Alam", placeId: "ChIJjzPgsSk70i0ROFqYRDF6dXI" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", photoUrl: null, rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", placeId: "ChIJB9-MlZFYei4RFKaIwGLEfHo" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", photoUrl: null, rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", placeId: "ChIJL3G7sDBG0i0RlyFWSlqLsAg" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", photoUrl: null, rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", placeId: "ChIJi0qTQOuPqy0RZOspMhmUkEI" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 28000, category: "Alam", placeId: "ChIJaYlbcBzc1y0RmvWcNkHMmQo" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 15000, category: "Alam", placeId: "ChIJN2lBUi7tMTARQx0OxhHf2EQ" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", photoUrl: null, rating: 4.5, userRatingsTotal: 38000, category: "Alam", placeId: "ChIJJzkVqaxJ0i0RxGGLKAqbg3c" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", photoUrl: null, rating: 4.9, userRatingsTotal: 5200, category: "Alam", placeId: "ChIJv2fzmCa3uy0RPP_rIcN8VCk" },
];

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
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("GOOGLE_MAPS_API_KEY not set, using fallback places");
      return serveFallback();
    }
    // Log key prefix for debugging (first 8 chars only)
    console.log("API key prefix:", GOOGLE_MAPS_API_KEY.substring(0, 8) + "...", "length:", GOOGLE_MAPS_API_KEY.length);

    const { category, preferences, searchQuery } = await req.json();

    let q = "";
    if (searchQuery) {
      q = `wisata ${searchQuery} Indonesia`;
    } else if (category && category !== "Semua") {
      const catMap: Record<string, string> = {
        Alam: "tempat wisata alam pemandangan Indonesia",
        Kuliner: "restoran kuliner populer Indonesia",
        Budaya: "tempat wisata budaya sejarah Indonesia",
        Petualangan: "aktivitas outdoor petualangan wisata Indonesia",
        Relaksasi: "spa resort relaksasi wellness Indonesia",
      };
      q = catMap[category] || "tempat wisata populer Indonesia";
    } else {
      q = "tempat wisata populer Indonesia";
    }

    console.log("Searching Google Maps for:", q);

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log("Google Maps status:", data.status, "results:", (data.results || []).length);

    if (!data.results || data.results.length === 0) {
      console.warn("No results from Google Maps, using fallback. Status:", data.status, "error:", data.error_message);
      return serveFallback(category);
    }

    const places = data.results.slice(0, 12).map((p: any) => {
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
    return serveFallback();
  }
});

function serveFallback(category?: string) {
  let filtered = fallbackPlaces;
  if (category && category !== "Semua") {
    filtered = fallbackPlaces.filter((p) => p.category === category);
    if (filtered.length === 0) filtered = fallbackPlaces;
  }
  return new Response(JSON.stringify({ places: filtered }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
