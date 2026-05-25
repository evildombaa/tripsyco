import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build a reliable image URL via Special:FilePath which handles thumbnailing for any filename
function commonsImageUrl(filename: string, width = 1200): string {
  const cleaned = filename.replace(/^File:/i, "").trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=${width}`;
}

// Extract original filename from a Wikimedia upload URL (thumb or original)
function filenameFromUploadUrl(url: string): string | null {
  // thumb: .../commons/thumb/x/yy/FILENAME.ext/NNNpx-FILENAME.ext
  const thumbMatch = url.match(/\/commons\/thumb\/[^/]+\/[^/]+\/([^/]+\.(?:jpg|jpeg|png|webp))\//i);
  if (thumbMatch) return decodeURIComponent(thumbMatch[1]);
  // original: .../commons/x/yy/FILENAME.ext
  const origMatch = url.match(/\/commons\/[^/]+\/[^/]+\/([^/]+\.(?:jpg|jpeg|png|webp))$/i);
  if (origMatch) return decodeURIComponent(origMatch[1]);
  return null;
}

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
      const fname = filenameFromUploadUrl(page.thumbnail.source);
      if (fname) photos.push(commonsImageUrl(fname, 1200));
      else photos.push(page.thumbnail.source);
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
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srnamespace=6&srlimit=20&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    // Normalize the search name into tokens for relevance filtering
    const nameTokens = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["dan", "the", "and", "candi", "pantai", "gunung", "danau", "pulau"].includes(t));

    const allResults = (searchData.query?.search || [])
      .map((r: any) => r.title as string)
      .filter((t: string) => {
        const lower = t.toLowerCase();
        return /\.(jpg|jpeg|png|webp)$/i.test(t) &&
          !lower.includes("map") &&
          !lower.includes("logo") &&
          !lower.includes("icon") &&
          !lower.includes("flag") &&
          !lower.includes("location") &&
          !lower.includes("diagram") &&
          !lower.includes("plan");
      });

    // Prioritize files whose name actually contains the place name tokens
    const scored = allResults.map((t: string) => {
      const lower = t.toLowerCase();
      const score = nameTokens.reduce((acc, tok) => acc + (lower.includes(tok) ? 1 : 0), 0);
      return { title: t, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const fileNames = scored
      .filter((s) => nameTokens.length === 0 || s.score > 0)
      .slice(0, 6)
      .map((s) => s.title);

    if (fileNames.length === 0) return [];

    // Get actual image URLs
    const titles = fileNames.join("|");
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    const pages = infoData.query?.pages;

    if (!pages) return [];

    // Preserve the original (sorted) order from fileNames
    const orderMap = new Map<string, number>();
    fileNames.forEach((f, i) => orderMap.set(f, i));
    const entries: { title: string; url: string }[] = [];
    for (const p of Object.values(pages) as any[]) {
      const sourceUrl = p.imageinfo?.[0]?.url;
      if (!sourceUrl || !p.title) continue;
      const fname = filenameFromUploadUrl(sourceUrl) || (p.title as string).replace(/^File:/i, "");
      entries.push({ title: p.title, url: commonsImageUrl(fname, 1200) });
    }
    entries.sort((a, b) => (orderMap.get(a.title) ?? 99) - (orderMap.get(b.title) ?? 99));
    return entries.map((e) => e.url);
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
