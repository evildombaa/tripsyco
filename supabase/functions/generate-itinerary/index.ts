import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { preferences, feedback, liked_places } = await req.json();
    const { destination, travel_purpose, travel_companion, travel_style, budget, duration, departure_date } = preferences;

    let numDays = 1;
    if (duration === "2–3 hari") numDays = 3;
    else if (duration === "4–5 hari") numDays = 5;
    else if (duration === "1 minggu") numDays = 7;
    else if (duration === "1 hari") numDays = 1;
    else {
      const parsed = parseInt(duration);
      numDays = isNaN(parsed) ? 3 : parsed;
    }

    // Calculate dates for each day
    const dates: string[] = [];
    if (departure_date) {
      const startDate = new Date(departure_date);
      for (let i = 0; i < numDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
    }

    // Build places context from liked_places or Google Places
    let placesContext = "";
    
    if (liked_places && Array.isArray(liked_places) && liked_places.length > 0) {
      // Use liked places from V2 swipe flow
      placesContext = `Berikut tempat-tempat yang DIPILIH oleh user (WAJIB gunakan semua tempat ini dalam itinerary):
${liked_places.map((p: any) => `- ${p.name} (${p.address || "alamat tidak diketahui"}, rating: ${p.rating || "-"}): ${p.description || ""}`).join("\n")}`;
    } else {
      // Fallback: let AI generate places
      placesContext = `Gunakan pengetahuanmu tentang tempat wisata, restoran, dan aktivitas populer di ${destination}. Pastikan semua tempat yang disebutkan adalah tempat nyata yang benar-benar ada.`;
    }

    let feedbackContext = "";
    if (feedback && Array.isArray(feedback) && feedback.length > 0) {
      feedbackContext = `\n\nPENTING - Berikut feedback dari perjalanan sebelumnya user ini:
${feedback.map((f: any, i: number) => `${i + 1}. Rating: ${f.rating}/5 | Pendapat: "${f.feedback}" | Saran: "${f.suggestions}"`).join("\n")}
Sesuaikan itinerary berdasarkan feedback di atas.`;
    }

    const dateContext = dates.length > 0
      ? `\nTANGGAL PERJALANAN: ${dates.join(", ")}
PENTING - Pertimbangkan hal berikut untuk setiap tanggal:
1. Hari besar nasional Indonesia yang jatuh pada tanggal-tanggal tersebut
2. Event lokal atau festival di ${destination} pada tanggal tersebut
3. Weekend vs weekday
4. Jika ada hari besar: beberapa tempat mungkin TUTUP
5. Sesuaikan jadwal berdasarkan kondisi di atas`
      : "";

    const prompt = `Kamu adalah travel planner profesional untuk wisata di Indonesia.
Buatkan itinerary ${numDays} hari untuk perjalanan ke ${destination} dengan detail berikut:
- Tujuan: ${travel_purpose}
- Teman perjalanan: ${travel_companion}
- Gaya perjalanan: ${travel_style}
- Budget: Rp ${Number(budget).toLocaleString("id-ID")}
${dateContext}

${placesContext}
${feedbackContext}

PENTING: 
1. ${liked_places?.length ? "WAJIB gunakan SEMUA tempat yang dipilih user di atas" : "Gunakan tempat nyata yang ada di " + destination}
2. Berikan status untuk setiap aktivitas: "must", "want", atau "maybe"
3. Berikan estimasi biaya setiap aktivitas dalam Rupiah
4. Berikan deskripsi singkat untuk setiap aktivitas
5. Pertimbangkan jarak dan waktu tempuh antar tempat
6. Jika ada hari besar/event pada tanggal tertentu, SEBUTKAN di deskripsi

Berikan response dalam format JSON SAJA (tanpa markdown, tanpa backtick) dengan struktur:
{
  "trip_name": "Nama perjalanan yang menarik",
  "days": [
    {
      "date": "${dates[0] || ""}",
      "date_label": "Hari 1 - Senin, 15 Maret 2026",
      "notes": "Catatan khusus tentang hari ini atau null",
      "items": [
        {
          "time": "08:00",
          "activity": "Deskripsi aktivitas",
          "location": "Nama tempat",
          "status": "must",
          "description": "Deskripsi singkat 1-2 kalimat.",
          "estimated_cost": 50000,
          "rating": 4.5,
          "place_id": null
        }
      ]
    }
  ]
}`;

    console.log("Generating itinerary for", destination, "with", liked_places?.length || 0, "liked places");

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
        max_tokens: 4096,
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

    console.log("Generated itinerary with", itinerary.days?.length || 0, "days");

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
