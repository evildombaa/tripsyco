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

    const { messages, itinerary_context } = await req.json();

    const systemPrompt = `Kamu adalah asisten perjalanan AI bernama Tripsy Assistant. Kamu LANGSUNG MENGUBAH itinerary user, bukan hanya memberikan saran.

KONTEKS ITINERARY SAAT INI:
${JSON.stringify(itinerary_context, null, 2)}

ATURAN PENTING:
- Ketika user meminta perubahan (ganti, tambah, hapus, sesuaikan), SELALU sertakan JSON action di akhir response
- Berikan penjelasan SINGKAT (1-2 kalimat) tentang apa yang kamu ubah, lalu sertakan JSON
- Selalu jawab dalam Bahasa Indonesia
- Berikan estimasi biaya dalam Rupiah
- Pertimbangkan budget user saat memberikan saran
- day_index dimulai dari 0 (hari 1 = index 0)
- activity_index dimulai dari 0

FORMAT ACTION (WAJIB disertakan saat ada perubahan):

Untuk mengganti satu aktivitas:
\`\`\`json
{
  "action": "replace_activity",
  "day_index": 0,
  "changes": {
    "activity_index": 0,
    "new_activity": {
      "time": "08:00",
      "activity": "Nama Aktivitas",
      "location": "Nama Tempat",
      "status": "want",
      "description": "Deskripsi singkat",
      "estimated_cost": 50000,
      "rating": 4.5
    }
  }
}
\`\`\`

Untuk menambah aktivitas:
\`\`\`json
{
  "action": "add_activity",
  "day_index": 0,
  "changes": {
    "new_activity": {
      "time": "15:00",
      "activity": "Nama Aktivitas",
      "location": "Nama Tempat",
      "status": "want",
      "description": "Deskripsi singkat",
      "estimated_cost": 30000
    }
  }
}
\`\`\`

Untuk menghapus aktivitas:
\`\`\`json
{
  "action": "remove_activity",
  "day_index": 0,
  "changes": { "activity_index": 1 }
}
\`\`\`

Untuk mengganti seluruh hari:
\`\`\`json
{
  "action": "regenerate_day",
  "day_index": 0,
  "changes": {
    "activities": [
      { "time": "08:00", "activity": "...", "location": "...", "status": "must", "description": "...", "estimated_cost": 0 },
      { "time": "10:00", "activity": "...", "location": "...", "status": "want", "description": "...", "estimated_cost": 0 }
    ]
  }
}
\`\`\`

Untuk menyesuaikan budget:
\`\`\`json
{
  "action": "adjust_budget",
  "changes": {
    "new_budget": 1500000,
    "day_updates": [
      {
        "day_index": 0,
        "activities": [...]
      }
    ]
  }
}
\`\`\`

Untuk modify hari (ubah lokasi + aktivitas):
\`\`\`json
{
  "action": "modify_day",
  "day_index": 0,
  "changes": {
    "location": "Lokasi Baru",
    "activities": [...]
  }
}
\`\`\`

Jika user hanya bertanya informasi tanpa minta perubahan, jawab biasa TANPA JSON.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
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

    return new Response(JSON.stringify({ message: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("itinerary-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
