import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

const fallbackPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", placeId: "ChIJm8w2en1G0i0RMBqEbF1fRfU" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", placeId: "ChIJW2v5bKxJ0i0RhKMb3387bKk" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", placeId: "ChIJf-UWJaBYei4RSwIBbwVfJaE" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", placeId: "ChIJK2FPsINb1y0R7qqn1sXQHLw" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", placeId: "ChIJjzPgsSk70i0ROFqYRDF6dXI" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", placeId: "ChIJB9-MlZFYei4RFKaIwGLEfHo" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", placeId: "ChIJL3G7sDBG0i0RlyFWSlqLsAg" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", placeId: "ChIJi0qTQOuPqy0RZOspMhmUkEI" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", placeId: "ChIJaYlbcBzc1y0RmvWcNkHMmQo" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", placeId: "ChIJN2lBUi7tMTARQx0OxhHf2EQ" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", placeId: "ChIJJzkVqaxJ0i0RxGGLKAqbg3c" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", placeId: "ChIJv2fzmCa3uy0RPP_rIcN8VCk" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, searchQuery } = await req.json();

    if (!GOOGLE_MAPS_API_KEY) {
      console.log("No Google Maps API Key found, using fallback");
      return serveFallback(category);
    }

    let q = "";
    if (searchQuery) {
      q = `${searchQuery} tourist attractions in Indonesia`;
    } else if (category && category !== "Semua") {
      const catMap: Record<string, string> = {
        Alam: "nature parks tourist attractions in Indonesia",
        Kuliner: "best restaurants culinary in Indonesia",
        Budaya: "cultural historical places temples in Indonesia",
        Petualangan: "adventure outdoor activities in Indonesia",
        Relaksasi: "spas resorts wellness in Indonesia",
      };
      q = catMap[category] || "tourist attractions in Indonesia";
    } else {
      q = "top tourist attractions in Indonesia";
    }

    console.log("Searching Google Places for:", q);

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      q
    )}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      console.log("No results from Google Places, using fallback");
      return serveFallback(category);
    }

    const places = data.results.map((r: any) => {
      let photoUrl = null;
      if (r.photos && r.photos.length > 0) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${r.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
      }

      return {
        name: r.name,
        address: r.formatted_address,
        photoUrl,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        category: category !== "Semua" && category ? category : "Campuran",
        placeId: r.place_id,
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
