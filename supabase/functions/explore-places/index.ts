import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Curated Indonesian destinations with Unsplash images
const curatedPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", lat: -8.6212, lng: 115.0868, photoUrl: "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800&q=80" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", lat: -8.4312, lng: 115.2792, photoUrl: "https://images.unsplash.com/photo-1531592937781-344ad608fabf?w=800&q=80" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", lat: -7.6079, lng: 110.2038, photoUrl: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", lat: -8.0584, lng: 114.2420, photoUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&q=80" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", lat: -8.7275, lng: 115.5444, photoUrl: "https://images.unsplash.com/photo-1570789210967-2cac24634e00?w=800&q=80" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", lat: -7.7925, lng: 110.3659, photoUrl: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=800&q=80" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", lat: -8.7180, lng: 115.1686, photoUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", lat: -8.5500, lng: 119.4833, photoUrl: "https://images.unsplash.com/photo-1518930259200-3e5b29f42096?w=800&q=80" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", lat: -7.9425, lng: 112.9530, photoUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&q=80" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", lat: 2.6845, lng: 98.8588, photoUrl: "https://images.unsplash.com/photo-1571366343168-631c5bcca7a4?w=800&q=80" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", lat: -8.5181, lng: 115.2586, photoUrl: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&q=80" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", lat: -0.2300, lng: 130.5167, photoUrl: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800&q=80" },
  { name: "Prambanan", address: "Sleman, Yogyakarta, Indonesia", rating: 4.7, userRatingsTotal: 42000, category: "Budaya", lat: -7.7520, lng: 110.4914, photoUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80" },
  { name: "Gili Trawangan", address: "Lombok, NTB, Indonesia", rating: 4.6, userRatingsTotal: 22000, category: "Relaksasi", lat: -8.3519, lng: 116.0363, photoUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80" },
  { name: "Pulau Weh", address: "Sabang, Aceh, Indonesia", rating: 4.7, userRatingsTotal: 4500, category: "Petualangan", lat: 5.8833, lng: 95.3167, photoUrl: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80" },
  { name: "Tana Toraja", address: "Sulawesi Selatan, Indonesia", rating: 4.6, userRatingsTotal: 8200, category: "Budaya", lat: -3.0637, lng: 119.8506, photoUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80" },
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
