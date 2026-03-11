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

    const systemPrompt = `Kamu adalah asisten perjalanan AI bernama Tripsy Assistant. Kamu membantu user mengatur itinerary perjalanan mereka di Indonesia.

KONTEKS ITINERARY SAAT INI:
${JSON.stringify(itinerary_context, null, 2)}

KEMAMPUANMU:
1. Memberikan rekomendasi tempat wisata yang serupa
2. Menyesuaikan itinerary jika budget melebihi batas
3. Mengganti seluruh rencana perjalanan atau hari tertentu
4. Memberikan tips perjalanan dan estimasi biaya
5. Menyarankan alternatif jika cuaca buruk
6. Mengoptimalkan rute perjalanan

ATURAN:
- Selalu jawab dalam Bahasa Indonesia
- Berikan estimasi biaya dalam Rupiah
- Jika user ingin mengubah itinerary, berikan respons dalam format yang jelas
- Jika user bertanya tentang tempat, berikan deskripsi singkat dan rating jika kamu tahu
- Selalu pertimbangkan budget user saat memberikan saran

Jika user meminta perubahan itinerary, sertakan JSON di akhir response dalam format:
\`\`\`json
{
  "action": "modify_day" | "replace_activity" | "add_activity" | "remove_activity" | "regenerate_day" | "adjust_budget",
  "day_index": 0,
  "changes": { ... }
}
\`\`\``;

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
