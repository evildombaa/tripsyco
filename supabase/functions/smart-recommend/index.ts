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

    const {
      location,
      time_slot_start,
      time_slot_end,
      budget_remaining,
      existing_activities,
      date,
      destination,
      mode, // "full_day" | "single" | "adapt" | "suggestions"
      current_location, // for single mode: last activity location
      search_query, // for suggestions mode: user search term
    } = await req.json();

    const searchLocation = location || destination || "Indonesia";

    // 1. Search attractions
    const attractionsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tempat+wisata+menarik+di+${encodeURIComponent(searchLocation)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const attractionsRes = await fetch(attractionsUrl);
    const attractionsData = await attractionsRes.json();

    // 2. Search restaurants
    const foodUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restoran+kafe+populer+${encodeURIComponent(searchLocation)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const foodRes = await fetch(foodUrl);
    const foodData = await foodRes.json();

    // 3. Search activities/entertainment
    const activitiesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=aktivitas+hiburan+${encodeURIComponent(searchLocation)}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
    const activitiesRes = await fetch(activitiesUrl);
    const activitiesData = await activitiesRes.json();

    // Combine all places with photo URLs
    const allPlaces = [
      ...(attractionsData.results || []).slice(0, 12),
      ...(foodData.results || []).slice(0, 8),
      ...(activitiesData.results || []).slice(0, 5),
    ].map((p: any) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating || 0,
      place_id: p.place_id,
      photo_url: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : null,
      types: (p.types || []).slice(0, 3),
      user_ratings_total: p.user_ratings_total || 0,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    }));

    // 4. Get travel times if we have a current location (for single recommendations)
    let travelContext = "";
    if (mode === "single" && current_location) {
      travelContext = `\nUser saat ini berada di: ${current_location}. Prioritaskan tempat yang dekat dari lokasi ini.`;
    }

    // 5. Build AI prompt
    const existingList = (existing_activities || [])
      .map((a: any) => `- ${a.time}: ${a.activity} di ${a.location}`)
      .join("\n");

    let modeInstruction = "";
    if (mode === "full_day") {
      modeInstruction = `Buatkan jadwal lengkap dari jam ${time_slot_start || "08:00"} sampai ${time_slot_end || "21:00"} untuk satu hari penuh.
Sertakan aktivitas pagi, siang (termasuk makan siang), sore, dan malam (termasuk makan malam).
Jumlah aktivitas: 6-10 aktivitas.`;
    } else if (mode === "single") {
      modeInstruction = `Rekomendasikan 3-5 aktivitas berikutnya yang bisa dilakukan setelah aktivitas terakhir user.
Pertimbangkan waktu saat ini dan jarak dari lokasi terakhir.`;
    } else if (mode === "adapt") {
      modeInstruction = `User menghabiskan waktu lebih lama dari perkiraan. Sesuaikan jadwal berikutnya.
Aktivitas yang sudah ada:\n${existingList}\n
Reorganisasi sisa hari dengan mempertimbangkan waktu yang tersisa.`;
    }

    const prompt = `Kamu adalah travel planner profesional Indonesia yang sangat detail.

LOKASI: ${searchLocation}
TANGGAL: ${date || "hari ini"}
BUDGET TERSISA: Rp ${(budget_remaining || 0).toLocaleString("id-ID")}
${travelContext}

${modeInstruction}

Tempat-tempat yang tersedia di ${searchLocation} (dari Google Maps):
${allPlaces.map((p: any) => `- ${p.name} (${p.address}, rating: ${p.rating}, reviews: ${p.user_ratings_total})`).join("\n")}

${existingList ? `Aktivitas yang sudah ada (jangan duplikasi):\n${existingList}` : ""}

PERTIMBANGKAN:
1. Jarak dan waktu tempuh antar tempat (estimasi berdasarkan lokasi)
2. Prediksi kondisi cuaca di ${searchLocation} pada ${date || "hari ini"} (estimasi berdasarkan musim dan lokasi)
3. Kemungkinan event lokal atau hari besar Indonesia pada ${date || "hari ini"}
4. Kepadatan pengunjung berdasarkan waktu (hindari jam ramai)
5. Budget user - berikan estimasi biaya setiap aktivitas dalam Rupiah
6. Waktu tempuh realistis dari satu tempat ke tempat lain

Berikan response dalam format JSON SAJA (tanpa markdown, tanpa backtick) dengan struktur:
{
  "weather_prediction": "Deskripsi singkat prediksi cuaca",
  "local_events": "Event lokal atau hari besar jika ada, atau 'Tidak ada event khusus'",
  "budget_summary": {
    "total_estimated": 0,
    "remaining": 0,
    "status": "under_budget" atau "over_budget",
    "difference": 0
  },
  "recommendations": [
    {
      "time": "08:00",
      "activity": "Nama aktivitas yang deskriptif",
      "location": "Nama tempat (harus dari daftar di atas jika memungkinkan)",
      "description": "Deskripsi singkat 1-2 kalimat tentang aktivitas dan tempat ini",
      "estimated_cost": 50000,
      "travel_time_from_previous": "15 menit",
      "status": "must" atau "want" atau "maybe",
      "rating": 4.5,
      "place_id": "place_id dari daftar di atas jika ada",
      "crowd_level": "low" atau "medium" atau "high",
      "weather_suitable": true,
      "tips": "Tips singkat untuk aktivitas ini"
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

    let result;
    try {
      result = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    // Match photo URLs from Google Places data
    if (result.recommendations) {
      for (const rec of result.recommendations) {
        const matchedPlace = allPlaces.find(
          (p: any) =>
            p.name.toLowerCase().includes(rec.location?.toLowerCase() || "") ||
            rec.location?.toLowerCase().includes(p.name.toLowerCase())
        );
        if (matchedPlace) {
          rec.photo_url = matchedPlace.photo_url;
          rec.place_id = rec.place_id || matchedPlace.place_id;
          rec.rating = rec.rating || matchedPlace.rating;
          rec.address = matchedPlace.address;
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-recommend error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
