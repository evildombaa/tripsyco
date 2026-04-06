import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const { preferences } = await req.json();
    const { destination, travel_purposes, travel_companion, travel_style, budget_range, date_start, date_end } = preferences;

    // Search Google Places
    const queries = [
      `tempat+wisata+${encodeURIComponent(destination)}`,
      `restoran+populer+${encodeURIComponent(destination)}`,
      `atraksi+${encodeURIComponent(destination)}`,
    ];

    const allPlaces: any[] = [];
    for (const q of queries) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      for (const p of (data.results || []).slice(0, 10)) {
        if (!allPlaces.find((x) => x.place_id === p.place_id)) {
          allPlaces.push({
            name: p.name,
            address: p.formatted_address,
            rating: p.rating,
            place_id: p.place_id,
            photo_url: p.photos?.[0]?.photo_reference
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
              : null,
          });
        }
      }
    }

    // Use OpenAI to curate and describe
    const prompt = `Kamu adalah travel expert Indonesia. Berdasarkan preferensi berikut:
- Destinasi: ${destination}
- Tanggal: ${date_start} - ${date_end}
- Tujuan: ${(travel_purposes || []).join(", ")}
- Teman: ${travel_companion}
- Gaya: ${travel_style}
- Budget: ${budget_range}

Dari daftar tempat berikut, pilih 10-15 tempat TERBAIK yang paling cocok dengan preferensi di atas dan beri deskripsi menarik singkat (2-3 kalimat) untuk masing-masing:

${allPlaces.map((p) => `- ${p.name} (rating: ${p.rating}, place_id: ${p.place_id})`).join("\n")}

Response dalam format JSON SAJA (tanpa markdown):
{
  "places": [
    {
      "name": "Nama tempat",
      "description": "Deskripsi menarik 2-3 kalimat",
      "rating": 4.5,
      "place_id": "place_id"
    }
  ]
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
    });

    if (!openaiRes.ok) throw new Error(`OpenAI error: ${openaiRes.status}`);

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    // Match photos back
    const result = (parsed.places || []).map((p: any) => {
      const matched = allPlaces.find((ap) => ap.place_id === p.place_id || ap.name.toLowerCase() === p.name.toLowerCase());
      return {
        name: p.name,
        description: p.description,
        rating: p.rating,
        photo_url: matched?.photo_url || null,
        place_id: p.place_id || matched?.place_id || null,
        address: matched?.address || "",
      };
    });

    return new Response(JSON.stringify({ places: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-places-v2 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
