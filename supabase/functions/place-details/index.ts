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

    // Step 3: Get multiple images from the page
    const imagesUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=20&format=json&origin=*`;
    const imagesRes = await fetch(imagesUrl);
    const imagesData = await imagesRes.json();
    const imagesPages = imagesData.query?.pages;
    const imagesPage = imagesPages ? Object.values(imagesPages)[0] as any : null;

    const imageFiles = (imagesPage?.images || [])
      .map((img: any) => img.title as string)
      .filter((title: string) =>
        /\.(jpg|jpeg|png|webp)$/i.test(title) &&
        !title.toLowerCase().includes("icon") &&
        !title.toLowerCase().includes("logo") &&
        !title.toLowerCase().includes("flag") &&
        !title.toLowerCase().includes("commons") &&
        !title.toLowerCase().includes("symbol") &&
        !title.toLowerCase().includes("map")
      )
      .slice(0, 8);

    // Step 4: Get image URLs
    const photos: string[] = [];
    if (page.thumbnail?.source) {
      photos.push(page.thumbnail.source);
    }

    if (imageFiles.length > 0) {
      const fileTitles = imageFiles.join("|");
      const fileInfoUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitles)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
      const fileInfoRes = await fetch(fileInfoUrl);
      const fileInfoData = await fileInfoRes.json();
      const filePages = fileInfoData.query?.pages;
      if (filePages) {
        for (const fp of Object.values(filePages) as any[]) {
          const thumbUrl = fp.imageinfo?.[0]?.thumburl || fp.imageinfo?.[0]?.url;
          if (thumbUrl && !photos.includes(thumbUrl)) {
            photos.push(thumbUrl);
          }
        }
      }
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

// Use Overpass API (OpenStreetMap) to find nearby places
async function fetchNearbyPlaces(lat: number, lng: number, type: "hotel" | "attraction") {
  try {
    let query = "";
    if (type === "hotel") {
      query = `
        [out:json][timeout:10];
        (
          node["tourism"="hotel"](around:5000,${lat},${lng});
          node["tourism"="guest_house"](around:5000,${lat},${lng});
          node["tourism"="hostel"](around:5000,${lat},${lng});
          way["tourism"="hotel"](around:5000,${lat},${lng});
        );
        out center 8;
      `;
    } else {
      query = `
        [out:json][timeout:10];
        (
          node["tourism"="attraction"](around:10000,${lat},${lng});
          node["tourism"="viewpoint"](around:10000,${lat},${lng});
          node["historic"](around:10000,${lat},${lng});
          way["tourism"="attraction"](around:10000,${lat},${lng});
        );
        out center 8;
      `;
    }

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();

    return (data.elements || [])
      .filter((el: any) => el.tags?.name)
      .slice(0, 6)
      .map((el: any) => ({
        name: el.tags.name,
        address: [el.tags["addr:street"], el.tags["addr:city"]].filter(Boolean).join(", ") || "",
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        stars: el.tags.stars ? parseInt(el.tags.stars) : undefined,
        website: el.tags.website || null,
      }));
  } catch (e) {
    console.error(`Overpass ${type} error:`, e);
    return [];
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

    // Fetch Wikipedia data and nearby places in parallel
    const [wikiData, nearbyHotels, nearbyAttractions, unsplashPhotos] = await Promise.all([
      fetchWikipediaData(name),
      fetchNearbyPlaces(lat, lng, "hotel"),
      fetchNearbyPlaces(lat, lng, "attraction"),
      fetchUnsplashPhotos(`${name} tourism`),
    ]);

    console.log("Wikipedia:", wikiData ? `Found: ${wikiData.title}` : "Not found");
    console.log("Hotels:", nearbyHotels.length, "Attractions:", nearbyAttractions.length);
    console.log("Unsplash photos:", unsplashPhotos.length);

    // Combine photos: Wikipedia first, then Unsplash
    const photos = [
      ...(wikiData?.photos || []),
      ...unsplashPhotos,
    ].slice(0, 6);

    // Filter out self from nearby attractions
    const filteredAttractions = nearbyAttractions.filter(
      (a: any) => a.name.toLowerCase() !== name.toLowerCase()
    );

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
      nearbyHotels: nearbyHotels.map((h: any) => ({
        name: h.name,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        photoUrl: null,
      })),
      nearbyAttractions: filteredAttractions.map((a: any) => ({
        name: a.name,
        address: a.address,
        lat: a.lat,
        lng: a.lng,
        photoUrl: null,
      })),
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
