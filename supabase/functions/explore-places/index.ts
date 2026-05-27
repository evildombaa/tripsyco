import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build a reliable image URL via Wikimedia Special:FilePath
function commonsImageUrl(filename: string, width = 800): string {
  const cleaned = filename.replace(/^File:/i, "").trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=${width}`;
}

// Cache gallery photo lookups per cold start so each card keeps one stable image
const galleryPhotoCache = new Map<string, string | null>();

async function fetchCommonsFirstPhoto(name: string): Promise<string | null> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srnamespace=6&srlimit=20&format=json&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const nameTokens = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["dan", "the", "and", "candi", "pantai", "gunung", "danau", "pulau"].includes(t));
    const results = (data.query?.search || [])
      .map((r: any) => r.title as string)
      .filter((t: string) => {
        const l = t.toLowerCase();
        return /\.(jpg|jpeg|png|webp)$/i.test(t) &&
          !l.includes("map") && !l.includes("logo") && !l.includes("icon") &&
          !l.includes("flag") && !l.includes("location") &&
          !l.includes("diagram") && !l.includes("plan");
      });
    const scored = results.map((t: string) => {
      const l = t.toLowerCase();
      const score = nameTokens.reduce((acc, tok) => acc + (l.includes(tok) ? 1 : 0), 0);
      return { title: t, score };
    });
    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const top = scored.filter((s) => nameTokens.length === 0 || s.score > 0)[0];
    if (!top) return null;
    const fname = top.title.replace(/^File:/i, "");
    return commonsImageUrl(fname, 800);
  } catch (e) {
    console.error("commons first photo error", name, e);
    return null;
  }
}

async function fetchCardGalleryPhoto(name: string): Promise<string | null> {
  if (galleryPhotoCache.has(name)) return galleryPhotoCache.get(name) ?? null;
  const url = await fetchCommonsFirstPhoto(name);
  galleryPhotoCache.set(name, url);
  return url;
}

// Curated Indonesian destinations. Card images are filled only from the same Wikimedia Commons gallery source as detail pages.
const curatedPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", lat: -8.6212, lng: 115.0868 },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", lat: -8.4312, lng: 115.2792 },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", lat: -7.6079, lng: 110.2038 },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", lat: -8.0584, lng: 114.2420 },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", lat: -8.7275, lng: 115.5444 },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", lat: -7.7925, lng: 110.3659 },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", lat: -8.7180, lng: 115.1686 },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", lat: -8.5500, lng: 119.4833 },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", lat: -7.9425, lng: 112.9530 },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", lat: 2.6845, lng: 98.8588 },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", lat: -8.5181, lng: 115.2586 },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", lat: -0.2300, lng: 130.5167 },
  { name: "Prambanan", address: "Sleman, Yogyakarta, Indonesia", rating: 4.7, userRatingsTotal: 42000, category: "Budaya", lat: -7.7520, lng: 110.4914 },
  { name: "Gili Trawangan", address: "Lombok, NTB, Indonesia", rating: 4.6, userRatingsTotal: 22000, category: "Relaksasi", lat: -8.3519, lng: 116.0363 },
  { name: "Pulau Weh", address: "Sabang, Aceh, Indonesia", rating: 4.7, userRatingsTotal: 4500, category: "Petualangan", lat: 5.8833, lng: 95.3167 },
  { name: "Tana Toraja", address: "Sulawesi Selatan, Indonesia", rating: 4.6, userRatingsTotal: 8200, category: "Budaya", lat: -3.0637, lng: 119.8506 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, searchQuery } = await req.json();

    let results = [...curatedPlaces];

    // Filter by category
    if (category && category !== "Semua") {
      results = results.filter((p) => p.category === category);
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );

      // If no results from curated, try OpenStreetMap Nominatim
      if (results.length === 0) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery + " Indonesia"
          )}&format=json&limit=10&addressdetails=1`;

          const res = await fetch(nominatimUrl, {
            headers: { "User-Agent": "Tripsy/1.0" },
          });
          const data = await res.json();

          if (data && data.length > 0) {
            results = data.map((item: any, idx: number) => ({
              name: item.display_name.split(",")[0],
              address: item.display_name.split(",").slice(1, 3).join(",").trim() || "Indonesia",
              rating: 4.5,
              userRatingsTotal: Math.floor(Math.random() * 10000) + 1000,
              category: category !== "Semua" && category ? category : "Campuran",
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              photoUrl: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80`,
            }));
          }
        } catch (e) {
          console.error("Nominatim search error:", e);
        }
      }
    }

    // Fallback to all curated if empty
    if (results.length === 0) {
      results = curatedPlaces;
    }

    // Use the same image source as the detail page hero (Wikipedia main → Commons fallback)
    results = await Promise.all(
      results.map(async (p) => {
        const heroUrl = await fetchHeroPhoto(p.name);
        return heroUrl ? { ...p, photoUrl: heroUrl } : p;
      })
    );

    return new Response(JSON.stringify({ places: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-places error:", e);
    return new Response(JSON.stringify({ places: curatedPlaces }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
