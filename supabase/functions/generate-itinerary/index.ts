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

    const { preferences, feedback } = await req.json();
    const { destination, travel_purpose, travel_companion, travel_style, budget, duration } = preferences;

    let numDays = 1;
    if (duration === "2–3 hari") numDays = 3;
    else if (duration === "4–5 hari") numDays = 5;
    else if (duration === "1 minggu") numDays = 7;
    else if (duration === "1 hari") numDays = 1;
    else {
      const parsed = parseInt(duration);
      numDays = isNaN(parsed) ? 3 : parsed;
    }

    // Search places
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tempat+wisata+${encodeURIComponent(destination)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();

    const topPlaces = (placesData.results || []).slice(0, 20).map((p: any) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      place_id: p.place_id,
      photo_url: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : null,
    }));

    // Search restaurants
    const foodUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restoran+populer+${encodeURIComponent(destination)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const foodRes = await fetch(foodUrl);
    const foodData = await foodRes.json();

    const topFood = (foodData.results || []).slice(0, 10).map((p: any) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      place_id: p.place_id,
      photo_url: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : null,
    }));

    let feedbackContext = "";
    if (feedback && Array.isArray(feedback) && feedback.length > 0) {
      feedbackContext = `\n\nPENTING - Berikut feedback dari perjalanan sebelumnya user ini:
${feedback.map((f: any, i: number) => `${i + 1}. Rating: ${f.rating}/5 | Pendapat: "${f.feedback}" | Saran: "${f.suggestions}"`).join("\n")}
Sesuaikan itinerary berdasarkan feedback di atas.`;
    }

    const prompt = `Kamu adalah travel planner profesional untuk wisata di Indonesia.
Buatkan itinerary ${numDays} hari untuk perjalanan ke ${destination} dengan detail berikut:
- Tujuan: ${travel_purpose}
- Teman perjalanan: ${travel_companion}
- Gaya perjalanan: ${travel_style}
- Budget: ${budget}

Berikut tempat wisata populer di ${destination} (dari Google Maps):
${topPlaces.map((p: any) => `- ${p.name} (${p.address}, rating: ${p.rating}, place_id: ${p.place_id})`).join("\n")}

Berikut restoran populer di ${destination}:
${topFood.map((p: any) => `- ${p.name} (${p.address}, rating: ${p.rating}, place_id: ${p.place_id})`).join("\n")}
${feedbackContext}

PENTING: 
1. Gunakan tempat-tempat dari daftar di atas sebanyak mungkin
2. Berikan status untuk setiap aktivitas: "must", "want", atau "maybe"
3. Berikan estimasi biaya setiap aktivitas dalam Rupiah
4. Berikan deskripsi singkat untuk setiap aktivitas
5. Pertimbangkan jarak dan waktu tempuh antar tempat

Berikan response dalam format JSON SAJA (tanpa markdown, tanpa backtick) dengan struktur:
{
  "trip_name": "Nama perjalanan yang menarik",
  "days": [
    {
      "date_label": "Hari 1",
      "items": [
        {
          "time": "08:00",
          "activity": "Deskripsi aktivitas",
          "location": "Nama tempat",
          "status": "must",
          "description": "Deskripsi singkat 1-2 kalimat",
          "estimated_cost": 50000,
          "rating": 4.5,
          "place_id": "place_id jika ada"
        }
      ]
    }
  ]
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || "";

    let itinerary;
    try {
      itinerary = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        itinerary = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse itinerary from AI response");
      }
    }

    // Match photo URLs
    const allPlaces = [...topPlaces, ...topFood];
    if (itinerary.days) {
      for (const day of itinerary.days) {
        for (const item of day.items || []) {
          const matched = allPlaces.find(
            (p: any) =>
              p.name.toLowerCase().includes(item.location?.toLowerCase() || "") ||
              item.location?.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matched) {
            item.photo_url = matched.photo_url;
            item.place_id = item.place_id || matched.place_id;
          }
        }
      }
    }

    return new Response(JSON.stringify({ itinerary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
