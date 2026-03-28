import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Search Wikipedia for a place and get its extract + images
async function fetchWikipediaData(name: string) {
  try {
    // Step 1: Search for the page
    const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    let pageTitle = searchData.query?.search?.[0]?.title;
    
    // If no result in Indonesian Wikipedia, try English
    let wikiLang = "id";
    if (!pageTitle) {
      const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`;
      const enSearchRes = await fetch(enSearchUrl);
      const enSearchData = await enSearchRes.json();
      pageTitle = enSearchData.query?.search?.[0]?.title;
      wikiLang = "en";
    }

    if (!pageTitle) return null;

    // Step 2: Get page extract and info
    const detailUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|pageimages|coordinates|info&exintro=true&explaintext=true&pithumbsize=800&inprop=url&format=json&origin=*`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();
    const pages = detailData.query?.pages;
    const page = pages ? Object.values(pages)[0] as any : null;

    if (!page || page.missing !== undefined) return null;

    // Get the main thumbnail only (Wikipedia page images are often unrelated)
    const photos: string[] = [];
    if (page.thumbnail?.source) {
      // Get higher resolution version
      const hiRes = page.thumbnail.source.replace(/\/\d+px-/, "/800px-");
      photos.push(hiRes);
    }

    return {
      title: page.title,
      extract: page.extract || null,
      url: page.fullurl || null,
      photos: photos.slice(0, 6),
      coordinates: page.coordinates?.[0] || null,
      lang: wikiLang,
    };
  } catch (e) {
    console.error("Wikipedia API error:", e);
    return null;
  }
}




// Get Unsplash photos for a place
async function fetchUnsplashPhotos(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
      { headers: { Authorization: "Client-ID " + "AXkVjB4YR7Y3C9FXQR3RN0fB_5j2hVjHfEfgJU2cjV0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => r.urls?.regular || r.urls?.small).filter(Boolean);
  } catch (e) {
    console.error("Unsplash error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, lat, lng } = await req.json();
    console.log("Request:", { name, lat, lng });

    // Fetch Wikipedia data and Unsplash photos in parallel
    const [wikiData, unsplashPhotos] = await Promise.all([
      fetchWikipediaData(name),
      fetchUnsplashPhotos(`${name} tourism`),
    ]);

    console.log("Wikipedia:", wikiData ? `Found: ${wikiData.title}` : "Not found");
    console.log("Unsplash photos:", unsplashPhotos.length);

    // Combine photos: Unsplash first (more relevant), then Wikipedia thumbnail
    const photos = [
      ...unsplashPhotos,
      ...(wikiData?.photos || []),
    ].slice(0, 6);

    const mapsUrl = `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`;

    const result = {
      name: wikiData?.title || name,
      address: "",
      description: wikiData?.extract || null,
      photos,
      reviews: [],
      website: wikiData?.url || null,
      mapsUrl,
      openingHours: null,
      lat: wikiData?.coordinates?.lat || lat,
      lng: wikiData?.coordinates?.lon || lng,
      nearbyHotels: [],
      nearbyAttractions: [],
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
