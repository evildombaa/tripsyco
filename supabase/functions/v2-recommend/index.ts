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

    const { destination, purposes, purpose_custom, companion, style, budget } = await req.json();

    // Search Google Places
    const queries = [
      `tempat+wisata+populer+${encodeURIComponent(destination)}`,
      `restoran+kafe+terbaik+${encodeURIComponent(destination)}`,
      `aktivitas+menarik+${encodeURIComponent(destination)}`,
    ];

    const allResults: any[] = [];
    for (const q of queries) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&language=id&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      allResults.push(...(data.results || []).slice(0, 10));
    }

    // Deduplicate by place_id
    const seen = new Set<string>();
    const uniquePlaces = allResults.filter((p) => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    const placesInfo = uniquePlaces.slice(0, 20).map((p: any) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating || 0,
      place_id: p.place_id,
      photo_url: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : null,
    }));

    // Use OpenAI to generate descriptions and filter relevance
    const purposeStr = [...(purposes || []), purpose_custom].filter(Boolean).join(", ");

    const prompt = `Kamu adalah travel advisor. Dari daftar tempat berikut di ${destination}, pilih 10-15 tempat paling relevan untuk traveler dengan profil:
- Tujuan: ${purposeStr}
- Pendamping: ${companion}
- Gaya: ${style}
- Budget: ${budget}

Daftar tempat:
${placesInfo.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.address}, rating: ${p.rating})`).join("\n")}

Berikan response JSON SAJA (tanpa markdown/backtick):
{
  "places": [
    {
      "index": 0,
      "description": "Deskripsi menarik 1-2 kalimat tentang tempat ini dan kenapa cocok untuk traveler ini"
    }
  ]
}

index adalah indeks dari daftar di atas (0-based). Urutkan dari yang paling direkomendasikan.`;

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

    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    const result = (parsed.places || []).map((p: any) => {
      const info = placesInfo[p.index];
      if (!info) return null;
      return {
        name: info.name,
        description: p.description,
        rating: info.rating,
        photo_url: info.photo_url,
        place_id: info.place_id,
        address: info.address,
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ places: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("v2-recommend error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
