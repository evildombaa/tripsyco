import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { name, lat, lng } = await req.json();
    console.log("Request:", { name, lat, lng });

    // Step 1: Find place using text search
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id&key=${GOOGLE_MAPS_API_KEY}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    console.log("Find place response:", JSON.stringify(findData));

    let placeId = findData.candidates?.[0]?.place_id;

    // Step 2: Get place details
    let details: any = null;
    let photos: string[] = [];

    if (placeId) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,reviews,editorial_summary,photos,geometry,types,opening_hours,website,url&key=${GOOGLE_MAPS_API_KEY}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json();
      console.log("Details response status:", detailsData.status);
      details = detailsData.result;

      // Build photo URLs via proxy edge function
      if (details?.photos) {
        photos = details.photos.slice(0, 6).map(
          (p: any) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        );
      }
    } else {
      console.log("No place_id found, trying text search as fallback");
      // Fallback: try textsearch
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&location=${lat},${lng}&radius=5000&key=${GOOGLE_MAPS_API_KEY}`;
      const textRes = await fetch(textSearchUrl);
      const textData = await textRes.json();
      console.log("Text search response:", textData.status, "results:", textData.results?.length);
      
      if (textData.results?.[0]) {
        placeId = textData.results[0].place_id;
        // Get full details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,reviews,editorial_summary,photos,geometry,types,opening_hours,website,url&key=${GOOGLE_MAPS_API_KEY}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        details = detailsData.result;

        if (details?.photos) {
          photos = details.photos.slice(0, 6).map(
            (p: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
          );
        }
      }
    }

    // Step 3: Nearby hotels
    let nearbyHotels: any[] = [];
    const searchLat = details?.geometry?.location?.lat || lat;
    const searchLng = details?.geometry?.location?.lng || lng;

    try {
      const hotelsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=5000&type=lodging&key=${GOOGLE_MAPS_API_KEY}`;
      const hotelsRes = await fetch(hotelsUrl);
      const hotelsData = await hotelsRes.json();
      console.log("Hotels response:", hotelsData.status, "count:", hotelsData.results?.length);
      nearbyHotels = (hotelsData.results || []).slice(0, 6).map((h: any) => ({
        name: h.name,
        address: h.vicinity || "",
        rating: h.rating,
        userRatingsTotal: h.user_ratings_total,
        photoUrl: h.photos?.[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${h.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
          : null,
        lat: h.geometry?.location?.lat,
        lng: h.geometry?.location?.lng,
      }));
    } catch (e) {
      console.error("Nearby hotels error:", e);
    }

    // Step 4: Nearby attractions
    let nearbyAttractions: any[] = [];
    try {
      const attractionsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=10000&type=tourist_attraction&key=${GOOGLE_MAPS_API_KEY}`;
      const attractionsRes = await fetch(attractionsUrl);
      const attractionsData = await attractionsRes.json();
      console.log("Attractions response:", attractionsData.status, "count:", attractionsData.results?.length);
      nearbyAttractions = (attractionsData.results || [])
        .filter((a: any) => a.name !== (details?.name || name))
        .slice(0, 6)
        .map((a: any) => ({
          name: a.name,
          address: a.vicinity || "",
          rating: a.rating,
          userRatingsTotal: a.user_ratings_total,
          photoUrl: a.photos?.[0]
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${a.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
            : null,
          lat: a.geometry?.location?.lat,
          lng: a.geometry?.location?.lng,
        }));
    } catch (e) {
      console.error("Nearby attractions error:", e);
    }

    const result = {
      name: details?.name || name,
      address: details?.formatted_address || "",
      rating: details?.rating,
      userRatingsTotal: details?.user_ratings_total,
      description: details?.editorial_summary?.overview || null,
      photos,
      reviews: (details?.reviews || []).slice(0, 5).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      })),
      website: details?.website || null,
      mapsUrl: details?.url || null,
      openingHours: details?.opening_hours?.weekday_text || null,
      lat: details?.geometry?.location?.lat || lat,
      lng: details?.geometry?.location?.lng || lng,
      nearbyHotels,
      nearbyAttractions,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("place-details error:", e);
    return new Response(JSON.stringify({ error: "Failed to fetch place details" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
