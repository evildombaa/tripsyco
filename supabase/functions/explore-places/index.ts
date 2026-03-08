import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fallbackPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", photoUrl: null, rating: 4.6, userRatingsTotal: 48200, category: "Budaya", placeId: "tanah-lot" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", photoUrl: null, rating: 4.5, userRatingsTotal: 32100, category: "Alam", placeId: "tegallalang" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 65000, category: "Budaya", placeId: "borobudur" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", placeId: "kawah-ijen" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", photoUrl: null, rating: 4.8, userRatingsTotal: 12000, category: "Alam", placeId: "nusa-penida" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", photoUrl: null, rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", placeId: "malioboro" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", photoUrl: null, rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", placeId: "pantai-kuta" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", photoUrl: null, rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", placeId: "komodo" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 28000, category: "Alam", placeId: "bromo" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", photoUrl: null, rating: 4.7, userRatingsTotal: 15000, category: "Alam", placeId: "danau-toba" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", photoUrl: null, rating: 4.5, userRatingsTotal: 38000, category: "Alam", placeId: "monkey-forest" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", photoUrl: null, rating: 4.9, userRatingsTotal: 5200, category: "Alam", placeId: "raja-ampat" },
];

function mapOsmCategory(type: string): string {
  if (["restaurant", "cafe", "fast_food", "food_court", "bar"].includes(type)) return "Kuliner";
  if (["hotel", "spa", "resort"].includes(type)) return "Relaksasi";
  if (["museum", "temple", "place_of_worship", "monument", "archaeological_site", "castle", "memorial"].includes(type)) return "Budaya";
  if (["national_park", "nature_reserve", "park", "garden", "beach", "volcano", "waterfall", "viewpoint", "water"].includes(type)) return "Alam";
  if (["theme_park", "zoo", "aquarium", "stadium", "climbing"].includes(type)) return "Petualangan";
  return "Alam";
}

async function fetchWikimediaThumb(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=1000&ggslimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": "Tripsy/1.0" } });
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0] as any;
      return page?.imageinfo?.[0]?.thumburl || null;
    }
  } catch (e) {
    console.warn("Wikimedia thumb fetch failed:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, searchQuery } = await req.json();

    let q = "";
    if (searchQuery) {
      q = `${searchQuery} Indonesia tourism`;
    } else if (category && category !== "Semua") {
      const catMap: Record<string, string> = {
        Alam: "nature park beach volcano Indonesia",
        Kuliner: "restaurant food culinary Indonesia",
        Budaya: "temple museum heritage culture Indonesia",
        Petualangan: "adventure outdoor activity Indonesia",
        Relaksasi: "spa resort wellness Indonesia",
      };
      q = catMap[category] || "tourism Indonesia";
    } else {
      q = "tourism attraction Indonesia";
    }

    console.log("Searching Nominatim for:", q);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=12&countrycodes=id&addressdetails=1&extratags=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Tripsy/1.0 (travel planner app)" },
    });
    const results = await res.json();

    console.log("Nominatim results:", results.length);

    if (!results || results.length === 0) {
      console.warn("No results from Nominatim, using fallback");
      return serveFallback(category);
    }

    // Fetch photos in parallel from Wikimedia Commons
    const placesWithPhotos = await Promise.all(
      results.map(async (r: any) => {
        const photoUrl = await fetchWikimediaThumb(parseFloat(r.lat), parseFloat(r.lon));
        const osmType = r.extratags?.tourism || r.extratags?.amenity || r.extratags?.natural || r.type || "";
        
        const addressParts = [];
        const addr = r.address || {};
        if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
        if (addr.state) addressParts.push(addr.state);
        if (addr.country) addressParts.push(addr.country);
        const address = addressParts.length > 0 ? addressParts.join(", ") : (r.display_name || "");

        return {
          name: r.name || r.display_name?.split(",")[0] || "Unknown",
          address,
          photoUrl,
          rating: null,
          userRatingsTotal: null,
          category: mapOsmCategory(osmType),
          placeId: `osm-${r.osm_type}-${r.osm_id}`,
        };
      })
    );

    // Filter by category if needed
    let filtered = placesWithPhotos;
    if (category && category !== "Semua") {
      const catFiltered = placesWithPhotos.filter((p: any) => p.category === category);
      if (catFiltered.length > 0) filtered = catFiltered;
    }

    return new Response(JSON.stringify({ places: filtered }), {
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
