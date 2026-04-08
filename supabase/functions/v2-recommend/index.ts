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

    const { destination, purposes, purpose_custom, companion, style, budget } = await req.json();

    const purposeStr = [...(purposes || []), purpose_custom].filter(Boolean).join(", ");

    const prompt = `Kamu adalah travel advisor profesional untuk Indonesia. Berikan rekomendasi 12-15 tempat wisata, restoran, dan aktivitas terbaik di ${destination} untuk traveler dengan profil:
- Tujuan: ${purposeStr || "wisata umum"}
- Pendamping: ${companion || "solo"}
- Gaya: ${style || "seimbang"}
- Budget: ${budget || "menengah"}

Untuk setiap tempat, berikan informasi yang akurat dan nyata (tempat yang benar-benar ada).
Untuk setiap tempat, berikan juga search_term yang bagus untuk mencari foto tempat tersebut (dalam bahasa Inggris, contoh: "Ubud Monkey Forest Bali", "Tanah Lot Temple Bali").

Berikan response JSON SAJA (tanpa markdown/backtick):
{
  "places": [
    {
      "name": "Nama tempat yang nyata dan ada",
      "description": "Deskripsi menarik 2-3 kalimat tentang tempat ini dan kenapa cocok untuk traveler ini",
      "rating": 4.5,
      "address": "Alamat lengkap tempat ini",
      "category": "wisata/kuliner/aktivitas/budaya/alam",
      "search_term": "Place Name City for photo search"
    }
  ]
}

Pastikan semua tempat adalah tempat nyata yang benar-benar ada di ${destination}. Rating antara 3.0-5.0. Urutkan dari yang paling direkomendasikan.`;

    console.log("Calling AI for recommendations...");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI response length:", content.length);

    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    const result = (parsed.places || []).map((p: any) => {
      const searchTerm = p.search_term || p.name;
      const photoUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(searchTerm)}`;
      return {
        name: p.name,
        description: p.description,
        rating: p.rating || 4.0,
        photo_url: photoUrl,
        place_id: null,
        address: p.address || null,
      };
    });

    console.log("Returning", result.length, "places with photos");

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
