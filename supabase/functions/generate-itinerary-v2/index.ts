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

    const { preferences, liked_places } = await req.json();
    const { destination, date_start, date_end, active_hours_start, active_hours_end, travel_purposes, travel_companion, travel_style, budget_range } = preferences;

    const prompt = `Kamu adalah travel planner profesional Indonesia. Buatkan itinerary detail berdasarkan:

PREFERENSI:
- Destinasi: ${destination}
- Tanggal: ${date_start} hingga ${date_end}
- Jam aktif: ${active_hours_start} - ${active_hours_end}
- Tujuan: ${(travel_purposes || []).join(", ")}
- Teman: ${travel_companion}
- Gaya: ${travel_style}
- Budget: ${budget_range}

TEMPAT YANG DISUKAI USER (susun itinerary dari tempat-tempat ini):
${liked_places.map((p: any) => `- ${p.name}: ${p.description} (rating: ${p.rating})`).join("\n")}

PENTING:
1. Susun jadwal harian yang efisien berdasarkan jarak antar tempat
2. Jadwal harus dalam rentang jam aktif (${active_hours_start} - ${active_hours_end})
3. Sertakan waktu makan dan istirahat
4. Berikan estimasi biaya per aktivitas dalam Rupiah
5. Pertimbangkan hari besar/event pada tanggal tersebut

Format JSON SAJA (tanpa markdown):
{
  "trip_name": "Nama trip menarik",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "date_label": "Hari 1 - Senin, 15 Maret 2026",
      "items": [
        {
          "time": "08:00",
          "activity": "Aktivitas",
          "location": "Nama tempat",
          "description": "Deskripsi singkat",
          "estimated_cost": 50000,
          "rating": 4.5
        }
      ]
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

    let itinerary;
    try {
      itinerary = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) itinerary = JSON.parse(match[0]);
      else throw new Error("Failed to parse itinerary");
    }

    // Match photo URLs from liked places
    if (itinerary.days) {
      for (const day of itinerary.days) {
        for (const item of day.items || []) {
          const matched = liked_places.find((p: any) =>
            p.name.toLowerCase().includes(item.location?.toLowerCase() || "") ||
            item.location?.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matched) {
            item.photo_url = matched.photo_url;
          }
        }
      }
    }

    return new Response(JSON.stringify({ itinerary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary-v2 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
