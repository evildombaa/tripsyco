import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response("Missing GOOGLE_MAPS_API_KEY", {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const url = new URL(req.url);
    const ref = url.searchParams.get("ref") ?? "";
    const maxwidth = url.searchParams.get("maxwidth") ?? "800";

    // Basic validation to prevent abuse.
    if (!ref || ref.length < 10 || ref.length > 500) {
      return new Response("Invalid photo reference", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const mw = Math.min(Math.max(parseInt(maxwidth, 10) || 800, 200), 1600);

    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${mw}&photoreference=${encodeURIComponent(
      ref
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    const photoRes = await fetch(googleUrl, { redirect: "follow" });

    if (!photoRes.ok) {
      const errText = await photoRes.text();
      console.error("place-photo google error", photoRes.status, errText);
      return new Response("Failed to fetch photo", {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";

    return new Response(photoRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        // Cache at the edge/browser to reduce quota usage.
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error("place-photo error:", e);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
