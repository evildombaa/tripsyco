import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Search Wikipedia for a place and get its extract + main image
async function fetchWikipediaData(name: string) {
  try {
    // Step 1: Search for the page in Indonesian Wikipedia
    const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    let pageTitle = searchData.query?.search?.[0]?.title;
    let wikiLang = "id";

    // Fallback to English Wikipedia
    if (!pageTitle) {
      const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`;
      const enSearchRes = await fetch(enSearchUrl);
      const enSearchData = await enSearchRes.json();
      pageTitle = enSearchData.query?.search?.[0]?.title;
      wikiLang = "en";
    }

    if (!pageTitle) return null;

    // Step 2: Get page extract, thumbnail, and coordinates
    const detailUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|pageimages|coordinates|info&exintro=true&explaintext=true&pithumbsize=1200&inprop=url&format=json&origin=*`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();
    const pages = detailData.query?.pages;
    const page = pages ? Object.values(pages)[0] as any : null;

    if (!page || page.missing !== undefined) return null;

    // Get high-res thumbnail
    const photos: string[] = [];
    if (page.thumbnail?.source && !page.thumbnail.source.includes(".svg")) {
      const hiRes = page.thumbnail.source.replace(/\/\d+px-/, "/1200px-");
      photos.push(hiRes);
    }

    return {
      title: page.title,
      extract: page.extract || null,
      url: page.fullurl || null,
      photos,
      coordinates: page.coordinates?.[0] || null,
      lang: wikiLang,
    };
  } catch (e) {
    console.error("Wikipedia API error:", e);
    return null;
  }
}

// Search Wikimedia Commons for photos of a place (free, no API key)
async function fetchCommonsPhotos(name: string): Promise<string[]> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srnamespace=6&srlimit=10&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const fileNames = (searchData.query?.search || [])
      .map((r: any) => r.title as string)
      .filter((t: string) => /\.(jpg|jpeg|png|webp)$/i.test(t))
      .slice(0, 6);

    if (fileNames.length === 0) return [];

    // Get actual image URLs
    const titles = fileNames.join("|");
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    const pages = infoData.query?.pages;

    if (!pages) return [];

    const photos: string[] = [];
    for (const p of Object.values(pages) as any[]) {
      const url = p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url;
      if (url) photos.push(url);
    }
    return photos;
  } catch (e) {
    console.error("Commons API error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, lat, lng } = await req.json();
    console.log("Request:", { name, lat, lng });

    // Fetch Wikipedia data and Commons photos in parallel
    const [wikiData, commonsPhotos] = await Promise.all([
      fetchWikipediaData(name),
      fetchCommonsPhotos(name),
    ]);

    console.log("Wikipedia:", wikiData ? `Found: ${wikiData.title}` : "Not found");
    console.log("Commons photos:", commonsPhotos.length);

    // Combine: Wikipedia main image first, then Commons photos
    const allPhotos = [
      ...(wikiData?.photos || []),
      ...commonsPhotos,
    ];
    // Deduplicate
    const photos = [...new Set(allPhotos)].slice(0, 6);

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
