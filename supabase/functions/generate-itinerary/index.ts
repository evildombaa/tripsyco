import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWikipediaImage(title: string): Promise<string | null> {
  for (const lang of ["id", "en"]) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=600&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data?.query?.pages || {};
      for (const k of Object.keys(pages)) {
        const p = pages[k];
        const img = p?.original?.source || p?.thumbnail?.source;
        if (img) return img;
      }
    } catch (_) { /* skip */ }
  }
  // Fallback: opensearch then pageimage
  try {
    const sUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&format=json&origin=*`;
    const sRes = await fetch(sUrl);
    if (sRes.ok) {
      const sData = await sRes.json();
      const first = sData?.[1]?.[0];
      if (first && first !== title) return await fetchWikipediaImage(first);
    }
  } catch (_) { /* skip */ }
  return null;
}

// Strict JSON schema for the itinerary response (Lovable AI Gateway /v1/responses)
const itinerarySchema = {
  type: "object",
  properties: {
    trip_name: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          notes: { type: ["string", "null"] },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                activity: { type: "string" },
                location: { type: "string" },
                status: { type: "string", enum: ["must", "want", "maybe"] },
                description: { type: "string" },
                estimated_cost: { type: "number" },
              },
              required: ["time", "activity", "location", "status", "description", "estimated_cost"],
              additionalProperties: false,
            },
          },
        },
        required: ["date", "notes", "items"],
        additionalProperties: false,
      },
    },
  },
  required: ["trip_name", "days"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Lovable AI Gateway — no external OpenAI API key needed
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { preferences, feedback, dates: requestedDates } = await req.json();
    const {
      destination,
      travel_purpose,
      travel_purposes,
      travel_companion,
      travel_style,
      budget,
      budget_tier,
      daily_hours_start,
      daily_hours_end,
    } = preferences || {};

    const dates: string[] = Array.isArray(requestedDates) ? requestedDates.filter(Boolean) : [];
    if (dates.length === 0) throw new Error("No dates provided to generate");

    const hoursStart = daily_hours_start || "08:00";
    const hoursEnd = daily_hours_end || "21:00";
    const purposes = Array.isArray(travel_purposes) && travel_purposes.length
      ? travel_purposes.join(", ")
      : (travel_purpose || "");

    let feedbackContext = "";
    if (feedback && Array.isArray(feedback) && feedback.length > 0) {
      feedbackContext = `\n\nPENTING - Berikut feedback dari perjalanan sebelumnya user ini:
${feedback.map((f: any, i: number) => `${i + 1}. Rating: ${f.rating}/5 | Pendapat: "${f.feedback}" | Saran: "${f.suggestions}"`).join("\n")}
Sesuaikan itinerary berdasarkan feedback di atas.`;
    }

    const budgetLabel = budget_tier || (budget ? `Rp ${Number(budget).toLocaleString("id-ID")}` : "fleksibel");

    const prompt = `Kamu adalah travel planner profesional untuk wisata di Indonesia.
Buatkan itinerary untuk perjalanan ke ${destination} dengan detail berikut:
- Tujuan utama: ${purposes}
- Teman perjalanan: ${travel_companion}
- Gaya perjalanan: ${travel_style}
- Budget: ${budgetLabel}
- Jam aktif harian: ${hoursStart} - ${hoursEnd}

TANGGAL PERJALANAN (buat itinerary untuk SETIAP tanggal di bawah ini, tidak boleh kurang):
${dates.join(", ")}

PENTING:
1. Untuk setiap tanggal, buat 4-7 aktivitas mulai dari ${hoursStart} sampai sekitar ${hoursEnd} (makan pagi, aktivitas utama, makan siang, aktivitas sore, makan malam, dst).
2. Gunakan nama tempat NYATA dan POPULER di ${destination} yang kemungkinan besar memiliki halaman Wikipedia (gunakan nama resmi/baku, misal "Candi Borobudur", "Pantai Kuta", "Tanah Lot"). Field "location" HARUS berupa nama tempat saja agar bisa dicari di Wikipedia.
3. Berikan status setiap aktivitas: "must" / "want" / "maybe".
4. Berikan estimasi biaya dalam Rupiah (number).
5. Pertimbangkan hari besar nasional Indonesia / event lokal pada tanggal tersebut dan sebutkan di description jika relevan.
6. Pertimbangkan jarak dan waktu tempuh antar tempat.
${feedbackContext}`;

    const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content: prompt }],
        text: {
          format: {
            type: "json_schema",
            name: "itinerary",
            strict: true,
            schema: itinerarySchema,
          },
        },
        reasoning: { effort: "low" },
      }),
    });

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      console.error("AI Gateway error:", gatewayRes.status, errText);
      throw new Error(`AI Gateway error: ${gatewayRes.status}`);
    }

    const gatewayData = await gatewayRes.json();

    // Extract text from Responses API output
    let content = typeof gatewayData.output_text === "string" ? gatewayData.output_text : "";
    if (!content && Array.isArray(gatewayData.output)) {
      for (const item of gatewayData.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (typeof part?.text === "string") content += part.text;
          }
        }
      }
    }
    if (!content) throw new Error("Empty response from AI Gateway");

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

    // Fetch Wikipedia photos for each item (with simple cache per request)
    if (itinerary.days) {
      const cache = new Map<string, string | null>();
      for (const day of itinerary.days) {
        for (const item of day.items || []) {
          const loc = (item.location || "").trim();
          if (!loc) continue;
          if (!cache.has(loc)) {
            cache.set(loc, await fetchWikipediaImage(loc));
          }
          const img = cache.get(loc) || null;
          item.image_url = img;
          item.photo_url = img;
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
