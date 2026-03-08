import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fallbackPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", placeId: "tanah-lot" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", placeId: "tegallalang" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", placeId: "borobudur" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", placeId: "kawah-ijen" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", placeId: "nusa-penida" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", placeId: "malioboro" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", placeId: "pantai-kuta" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", placeId: "komodo" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", placeId: "bromo" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", placeId: "danau-toba" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", placeId: "monkey-forest" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", placeId: "raja-ampat" },
];

function mapOsmCategory(type: string): string {
  if (["restaurant", "cafe", "fast_food", "food_court", "bar"].includes(type)) return "Kuliner";
  if (["hotel", "spa", "resort"].includes(type)) return "Relaksasi";
  if (["museum", "temple", "place_of_worship", "monument", "archaeological_site", "castle", "memorial"].includes(type)) return "Budaya";
  if (["national_park", "nature_reserve", "park", "garden", "beach", "volcano", "waterfall", "viewpoint", "water"].includes(type)) return "Alam";
  if (["theme_park", "zoo", "aquarium", "stadium", "climbing"].includes(type)) return "Petualangan";
  return "Alam";
}

async function fetchWikipediaImage(placeName: string): Promise<string | null> {
  try {
    // Search Wikipedia for the place and get page thumbnail
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(placeName)}&prop=pageimages&pithumbsize=800&format=json&redirects=1`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": "Tripsy/1.0 (travel planner app)" } });
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0] as any;
      if (page?.thumbnail?.source) return page.thumbnail.source;
    }

    // Try Indonesian Wikipedia as fallback
    const idUrl = `https://id.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(placeName)}&prop=pageimages&pithumbsize=800&format=json&redirects=1`;
    const idRes = await fetch(idUrl, { headers: { "User-Agent": "Tripsy/1.0 (travel planner app)" } });
    const idData = await idRes.json();
    const idPages = idData?.query?.pages;
    if (idPages) {
      const idPage = Object.values(idPages)[0] as any;
      if (idPage?.thumbnail?.source) return idPage.thumbnail.source;
    }
  } catch (e) {
    console.warn("Wikipedia image fetch failed for", placeName, e);
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

    // If Nominatim returns too few results, use fallback with Wikipedia images
    if (!results || results.length < 3) {
      console.log("Too few Nominatim results, using enriched fallback");
      return await serveEnrichedFallback(category);
    }

    // Fetch Wikipedia images in parallel
    const placesWithPhotos = await Promise.all(
      results.map(async (r: any) => {
        const name = r.name || r.display_name?.split(",")[0] || "Unknown";
        const photoUrl = await fetchWikipediaImage(name);
        const osmType = r.extratags?.tourism || r.extratags?.amenity || r.extratags?.natural || r.type || "";

        const addressParts = [];
        const addr = r.address || {};
        if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
        if (addr.state) addressParts.push(addr.state);
        if (addr.country) addressParts.push(addr.country);
        const address = addressParts.length > 0 ? addressParts.join(", ") : (r.display_name || "");

        return {
          name,
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
    return await serveEnrichedFallback();
  }
});

async function serveEnrichedFallback(category?: string) {
  let filtered = fallbackPlaces;
  if (category && category !== "Semua") {
    filtered = fallbackPlaces.filter((p) => p.category === category);
    if (filtered.length === 0) filtered = fallbackPlaces;
  }

  // Enrich fallback with Wikipedia images
  const enriched = await Promise.all(
    filtered.map(async (p) => {
      const photoUrl = await fetchWikipediaImage(p.name);
      return { ...p, photoUrl };
    })
  );

  return new Response(JSON.stringify({ places: enriched }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
