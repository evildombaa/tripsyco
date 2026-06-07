import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build a reliable image URL via Wikimedia Special:FilePath
function commonsImageUrl(filename: string, width = 800): string {
  const cleaned = filename.replace(/^File:/i, "").trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=${width}`;
}

function filenameFromUploadUrl(url: string): string | null {
  const thumbMatch = url.match(/\/commons\/thumb\/[^/]+\/[^/]+\/([^/]+\.(?:jpg|jpeg|png|webp))\//i);
  if (thumbMatch) return decodeURIComponent(thumbMatch[1]);
  const origMatch = url.match(/\/commons\/[^/]+\/[^/]+\/([^/]+\.(?:jpg|jpeg|png|webp))$/i);
  if (origMatch) return decodeURIComponent(origMatch[1]);
  return null;
}

// Cache gallery photo lookups per cold start so each card keeps one stable image
const galleryPhotoCache = new Map<string, string | null>();

const curatedGalleryPhotoByName: Record<string, string> = {
  "Tanah Lot": commonsImageUrl("Bali - Pura Tanah Lot, 20220827 0957 1108.jpg"),
  "Tegallalang Rice Terrace": commonsImageUrl("Rice terraces in Tegallalang 1.jpg"),
  "Candi Borobudur": commonsImageUrl("Borobudur - The many stupas.jpg"),
  "Kawah Ijen": commonsImageUrl("Crater of Kawah Ijen volcano, East Java, Indonesia, 20220821 0611 9726.jpg"),
  "Nusa Penida": commonsImageUrl("Diamond Beach in Nusa Penida, Bali.jpg"),
  "Malioboro": commonsImageUrl("Malioboro di Malam Hari-2.jpg"),
  "Pantai Kuta": commonsImageUrl("Kuta Beach Bali.jpg"),
  "Taman Nasional Komodo": commonsImageUrl("Andhika bayu nugraha-taman nasional komodo (gili lawa).jpg"),
  "Gunung Bromo": commonsImageUrl("Bromo and Semeru volcanoes, Java, Indonesia, 20220820 0717 9517.jpg"),
  "Danau Toba": commonsImageUrl("Danau Toba - Sumut.jpg"),
  "Ubud Monkey Forest": commonsImageUrl("Grooming, Macaca fascicularis, Ubud Monkey Forest, Bali, 20220822 1022 9965.jpg"),
  "Raja Ampat": commonsImageUrl("Landscape of Raja Ampat; April 2014.jpg"),
  "Prambanan": commonsImageUrl("Prambanan Java245.jpg"),
  "Gili Trawangan": commonsImageUrl("Beach bar, Beach cafe, Gili Trawangan (island), Indonesia.jpg"),
  "Pulau Weh": commonsImageUrl("Balohan Sea Port from the hill of east side of Weh Island, Sabang. Aceh.jpg"),
  "Tana Toraja": commonsImageUrl("Tana Toraja Graves and House.jpg"),
};

async function fetchCommonsFirstPhoto(name: string): Promise<string | null> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srnamespace=6&srlimit=20&format=json&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const nameTokens = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["dan", "the", "and", "candi", "pantai", "gunung", "danau", "pulau"].includes(t));
    const results = (data.query?.search || [])
      .map((r: any) => r.title as string)
      .filter((t: string) => {
        const l = t.toLowerCase();
        return /\.(jpg|jpeg|png|webp)$/i.test(t) &&
          !l.includes("map") && !l.includes("logo") && !l.includes("icon") &&
          !l.includes("flag") && !l.includes("location") &&
          !l.includes("diagram") && !l.includes("plan");
      });
    const scored = results.map((t: string) => {
      const l = t.toLowerCase();
      const score = nameTokens.reduce((acc, tok) => acc + (l.includes(tok) ? 1 : 0), 0);
      return { title: t, score };
    });
    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const top = scored.filter((s) => nameTokens.length === 0 || s.score > 0)[0];
    if (!top) return null;
    const fname = top.title.replace(/^File:/i, "");
    return commonsImageUrl(fname, 800);
  } catch (e) {
    console.error("commons first photo error", name, e);
    return null;
  }
}

async function fetchWikiGalleryPhoto(name: string): Promise<string | null> {
  try {
    for (const lang of ["id", "en"]) {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const title = searchData.query?.search?.[0]?.title;
      if (!title) continue;

      const detailUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=1200&format=json&origin=*`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const pages = detailData.query?.pages;
      const page = pages ? Object.values(pages)[0] as any : null;
      const sourceUrl = page?.thumbnail?.source;
      if (!sourceUrl || sourceUrl.includes(".svg")) continue;

      const filename = filenameFromUploadUrl(sourceUrl);
      return filename ? commonsImageUrl(filename, 800) : sourceUrl;
    }
  } catch (e) {
    console.error("wiki gallery photo error", name, e);
  }
  return null;
}

async function fetchCardGalleryPhoto(name: string): Promise<string | null> {
  if (curatedGalleryPhotoByName[name]) return curatedGalleryPhotoByName[name];
  if (galleryPhotoCache.has(name)) return galleryPhotoCache.get(name) ?? null;
  const [commons, wiki] = await Promise.all([
    fetchCommonsFirstPhoto(name),
    fetchWikiGalleryPhoto(name),
  ]);
  const url = commons || wiki || null;
  galleryPhotoCache.set(name, url);
  return url;
}

// Curated Indonesian destinations. Card images are filled only from the same Wikimedia Commons gallery source as detail pages.
const curatedPlaces = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", lat: -8.6212, lng: 115.0868, tags: ["pura", "temple", "bali", "sunset", "laut", "ikonik"] },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", lat: -8.4312, lng: 115.2792, tags: ["sawah", "rice terrace", "bali", "ubud", "pemandangan"] },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", lat: -7.6079, lng: 110.2038, tags: ["candi", "buddha", "warisan dunia", "yogyakarta", "sejarah"] },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", lat: -8.0584, lng: 114.2420, tags: ["gunung", "kawah", "blue fire", "hiking", "jawa timur"] },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", lat: -8.7275, lng: 115.5444, tags: ["pulau", "pantai", "bali", "snorkeling", "kelingking"] },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", lat: -7.7925, lng: 110.3659, tags: ["jalan", "belanja", "kuliner", "yogyakarta", "gudeg"] },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", lat: -8.7180, lng: 115.1686, tags: ["pantai", "bali", "surfing", "sunset"] },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", lat: -8.5500, lng: 119.4833, tags: ["komodo", "pulau", "labuan bajo", "diving", "satwa"] },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", lat: -7.9425, lng: 112.9530, tags: ["gunung", "sunrise", "kawah", "jawa timur", "hiking"] },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", lat: 2.6845, lng: 98.8588, tags: ["danau", "samosir", "batak", "sumatera"] },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", lat: -8.5181, lng: 115.2586, tags: ["hutan", "monyet", "ubud", "bali", "alam"] },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", lat: -0.2300, lng: 130.5167, tags: ["pulau", "diving", "snorkeling", "papua", "laut"] },
  { name: "Prambanan", address: "Sleman, Yogyakarta, Indonesia", rating: 4.7, userRatingsTotal: 42000, category: "Budaya", lat: -7.7520, lng: 110.4914, tags: ["candi", "hindu", "yogyakarta", "warisan dunia", "sejarah"] },
  { name: "Gili Trawangan", address: "Lombok, NTB, Indonesia", rating: 4.6, userRatingsTotal: 22000, category: "Relaksasi", lat: -8.3519, lng: 116.0363, tags: ["pulau", "pantai", "lombok", "snorkeling", "santai"] },
  { name: "Pulau Weh", address: "Sabang, Aceh, Indonesia", rating: 4.7, userRatingsTotal: 4500, category: "Petualangan", lat: 5.8833, lng: 95.3167, tags: ["pulau", "diving", "aceh", "kilometer nol"] },
  { name: "Tana Toraja", address: "Sulawesi Selatan, Indonesia", rating: 4.6, userRatingsTotal: 8200, category: "Budaya", lat: -3.0637, lng: 119.8506, tags: ["adat", "tongkonan", "sulawesi", "ritual", "budaya"] },
  // -------- Tambahan 50 destinasi --------
  { name: "Pantai Pandawa", address: "Kutuh, Badung, Bali", rating: 4.6, userRatingsTotal: 35000, category: "Relaksasi", lat: -8.8459, lng: 115.1869, tags: ["pantai", "bali", "tebing", "santai"] },
  { name: "Pantai Melasti", address: "Ungasan, Badung, Bali", rating: 4.7, userRatingsTotal: 18000, category: "Relaksasi", lat: -8.8489, lng: 115.1582, tags: ["pantai", "bali", "tebing", "sunset"] },
  { name: "Pura Ulun Danu Beratan", address: "Bedugul, Tabanan, Bali", rating: 4.6, userRatingsTotal: 22000, category: "Budaya", lat: -8.2752, lng: 115.1668, tags: ["pura", "danau", "bedugul", "bali", "temple"] },
  { name: "Pura Besakih", address: "Karangasem, Bali", rating: 4.5, userRatingsTotal: 12000, category: "Budaya", lat: -8.3741, lng: 115.4515, tags: ["pura", "hindu", "bali", "agung"] },
  { name: "Garuda Wisnu Kencana", address: "Ungasan, Badung, Bali", rating: 4.6, userRatingsTotal: 30000, category: "Budaya", lat: -8.8104, lng: 115.1671, tags: ["patung", "gwk", "bali", "taman budaya"] },
  { name: "Tegenungan Waterfall", address: "Sukawati, Gianyar, Bali", rating: 4.5, userRatingsTotal: 25000, category: "Alam", lat: -8.5750, lng: 115.2880, tags: ["air terjun", "bali", "ubud"] },
  { name: "Pantai Jimbaran", address: "Jimbaran, Badung, Bali", rating: 4.6, userRatingsTotal: 28000, category: "Kuliner", lat: -8.7905, lng: 115.1611, tags: ["pantai", "seafood", "kuliner", "bali", "sunset"] },
  { name: "Sanur Beach", address: "Denpasar, Bali", rating: 4.5, userRatingsTotal: 24000, category: "Relaksasi", lat: -8.6878, lng: 115.2622, tags: ["pantai", "bali", "sunrise", "santai"] },
  { name: "Pantai Tanjung Aan", address: "Lombok Tengah, NTB", rating: 4.7, userRatingsTotal: 9800, category: "Relaksasi", lat: -8.8978, lng: 116.3175, tags: ["pantai", "lombok", "pasir", "santai"] },
  { name: "Gunung Rinjani", address: "Lombok, NTB", rating: 4.8, userRatingsTotal: 11000, category: "Petualangan", lat: -8.4110, lng: 116.4574, tags: ["gunung", "hiking", "danau", "lombok", "segara anak"] },
  { name: "Air Terjun Tumpak Sewu", address: "Lumajang, Jawa Timur", rating: 4.8, userRatingsTotal: 8600, category: "Alam", lat: -8.2306, lng: 112.9170, tags: ["air terjun", "jawa timur", "alam"] },
  { name: "Kawah Putih", address: "Ciwidey, Bandung, Jawa Barat", rating: 4.5, userRatingsTotal: 33000, category: "Alam", lat: -7.1664, lng: 107.4022, tags: ["kawah", "bandung", "danau", "alam"] },
  { name: "Tangkuban Perahu", address: "Lembang, Bandung, Jawa Barat", rating: 4.4, userRatingsTotal: 27000, category: "Alam", lat: -6.7600, lng: 107.6094, tags: ["gunung", "kawah", "bandung", "lembang"] },
  { name: "Kota Tua Jakarta", address: "Jakarta Barat, DKI Jakarta", rating: 4.4, userRatingsTotal: 60000, category: "Budaya", lat: -6.1352, lng: 106.8133, tags: ["jakarta", "sejarah", "kota tua", "museum"] },
  { name: "Monumen Nasional", address: "Gambir, Jakarta Pusat", rating: 4.5, userRatingsTotal: 71000, category: "Budaya", lat: -6.1754, lng: 106.8272, tags: ["monas", "jakarta", "monumen", "sejarah"] },
  { name: "Taman Mini Indonesia Indah", address: "Jakarta Timur", rating: 4.5, userRatingsTotal: 56000, category: "Budaya", lat: -6.3024, lng: 106.8951, tags: ["tmii", "jakarta", "budaya", "taman"] },
  { name: "Ancol Dreamland", address: "Jakarta Utara", rating: 4.5, userRatingsTotal: 80000, category: "Petualangan", lat: -6.1228, lng: 106.8331, tags: ["ancol", "jakarta", "pantai", "taman bermain", "dufan"] },
  { name: "Pulau Seribu", address: "Kepulauan Seribu, DKI Jakarta", rating: 4.5, userRatingsTotal: 9500, category: "Relaksasi", lat: -5.7500, lng: 106.6000, tags: ["pulau", "jakarta", "snorkeling", "pantai"] },
  { name: "Pantai Parangtritis", address: "Bantul, Yogyakarta", rating: 4.5, userRatingsTotal: 47000, category: "Alam", lat: -8.0259, lng: 110.3322, tags: ["pantai", "yogyakarta", "sunset"] },
  { name: "Hutan Pinus Mangunan", address: "Bantul, Yogyakarta", rating: 4.4, userRatingsTotal: 21000, category: "Alam", lat: -7.9275, lng: 110.4106, tags: ["hutan", "pinus", "yogyakarta", "foto"] },
  { name: "Goa Jomblang", address: "Gunungkidul, Yogyakarta", rating: 4.7, userRatingsTotal: 5400, category: "Petualangan", lat: -8.0331, lng: 110.6386, tags: ["goa", "yogyakarta", "caving", "cahaya surga"] },
  { name: "Pantai Indrayanti", address: "Gunungkidul, Yogyakarta", rating: 4.5, userRatingsTotal: 32000, category: "Relaksasi", lat: -8.1517, lng: 110.6131, tags: ["pantai", "yogyakarta", "santai"] },
  { name: "Kraton Yogyakarta", address: "Yogyakarta", rating: 4.5, userRatingsTotal: 28000, category: "Budaya", lat: -7.8053, lng: 110.3642, tags: ["istana", "kraton", "yogyakarta", "sejarah"] },
  { name: "Taman Sari", address: "Yogyakarta", rating: 4.5, userRatingsTotal: 26000, category: "Budaya", lat: -7.8104, lng: 110.3590, tags: ["water castle", "yogyakarta", "sejarah"] },
  { name: "Lawang Sewu", address: "Semarang, Jawa Tengah", rating: 4.6, userRatingsTotal: 41000, category: "Budaya", lat: -6.9839, lng: 110.4106, tags: ["bangunan", "kolonial", "semarang", "sejarah"] },
  { name: "Sam Poo Kong", address: "Semarang, Jawa Tengah", rating: 4.6, userRatingsTotal: 22000, category: "Budaya", lat: -6.9989, lng: 110.3947, tags: ["klenteng", "semarang", "tionghoa"] },
  { name: "Dieng Plateau", address: "Wonosobo, Jawa Tengah", rating: 4.7, userRatingsTotal: 18000, category: "Alam", lat: -7.2061, lng: 109.9114, tags: ["dataran tinggi", "telaga", "candi", "dieng"] },
  { name: "Gunung Merbabu", address: "Boyolali, Jawa Tengah", rating: 4.8, userRatingsTotal: 7200, category: "Petualangan", lat: -7.4546, lng: 110.4404, tags: ["gunung", "hiking", "jawa tengah"] },
  { name: "Pantai Klayar", address: "Pacitan, Jawa Timur", rating: 4.6, userRatingsTotal: 12000, category: "Alam", lat: -8.2447, lng: 110.9425, tags: ["pantai", "pacitan", "seruling samudera"] },
  { name: "Madakaripura Waterfall", address: "Probolinggo, Jawa Timur", rating: 4.7, userRatingsTotal: 9100, category: "Alam", lat: -7.8819, lng: 113.0356, tags: ["air terjun", "jawa timur", "alam"] },
  { name: "Pulau Bawean", address: "Gresik, Jawa Timur", rating: 4.6, userRatingsTotal: 3200, category: "Relaksasi", lat: -5.7833, lng: 112.6500, tags: ["pulau", "pantai", "jawa timur"] },
  { name: "Pantai Pink", address: "Komodo, NTT", rating: 4.8, userRatingsTotal: 6800, category: "Alam", lat: -8.5483, lng: 119.4836, tags: ["pantai", "pink", "labuan bajo", "komodo"] },
  { name: "Pulau Padar", address: "Manggarai Barat, NTT", rating: 4.9, userRatingsTotal: 7500, category: "Petualangan", lat: -8.6500, lng: 119.5833, tags: ["pulau", "labuan bajo", "hiking", "viewpoint"] },
  { name: "Wae Rebo", address: "Manggarai, NTT", rating: 4.8, userRatingsTotal: 3100, category: "Budaya", lat: -8.7714, lng: 120.2511, tags: ["desa adat", "flores", "rumah adat"] },
  { name: "Danau Kelimutu", address: "Ende, Flores, NTT", rating: 4.8, userRatingsTotal: 5200, category: "Alam", lat: -8.7669, lng: 121.8208, tags: ["danau", "tiga warna", "flores", "gunung"] },
  { name: "Pantai Senggigi", address: "Lombok Barat, NTB", rating: 4.4, userRatingsTotal: 14000, category: "Relaksasi", lat: -8.4884, lng: 116.0436, tags: ["pantai", "lombok", "sunset"] },
  { name: "Gili Meno", address: "Lombok Utara, NTB", rating: 4.7, userRatingsTotal: 5800, category: "Relaksasi", lat: -8.3500, lng: 116.0667, tags: ["pulau", "gili", "snorkeling", "lombok"] },
  { name: "Pantai Tanjung Tinggi", address: "Belitung", rating: 4.7, userRatingsTotal: 11000, category: "Alam", lat: -2.5500, lng: 107.7028, tags: ["pantai", "belitung", "batu granit", "laskar pelangi"] },
  { name: "Pulau Lengkuas", address: "Belitung", rating: 4.8, userRatingsTotal: 6400, category: "Petualangan", lat: -2.5453, lng: 107.6206, tags: ["pulau", "mercusuar", "belitung", "snorkeling"] },
  { name: "Bukittinggi Jam Gadang", address: "Bukittinggi, Sumatera Barat", rating: 4.6, userRatingsTotal: 38000, category: "Budaya", lat: -0.3050, lng: 100.3692, tags: ["jam gadang", "sumatera barat", "minang"] },
  { name: "Ngarai Sianok", address: "Bukittinggi, Sumatera Barat", rating: 4.7, userRatingsTotal: 12000, category: "Alam", lat: -0.3000, lng: 100.3653, tags: ["lembah", "ngarai", "sumatera barat"] },
  { name: "Danau Maninjau", address: "Agam, Sumatera Barat", rating: 4.6, userRatingsTotal: 8500, category: "Alam", lat: -0.3167, lng: 100.2000, tags: ["danau", "kaldera", "sumatera barat"] },
  { name: "Pulau Samosir", address: "Danau Toba, Sumatera Utara", rating: 4.7, userRatingsTotal: 10500, category: "Budaya", lat: 2.5833, lng: 98.8333, tags: ["pulau", "danau toba", "batak", "samosir"] },
  { name: "Bukit Lawang", address: "Langkat, Sumatera Utara", rating: 4.7, userRatingsTotal: 7200, category: "Petualangan", lat: 3.5500, lng: 98.1083, tags: ["orangutan", "hutan", "sumatera", "trekking"] },
  { name: "Pantai Iboih", address: "Sabang, Aceh", rating: 4.7, userRatingsTotal: 3800, category: "Alam", lat: 5.8742, lng: 95.2667, tags: ["pantai", "aceh", "snorkeling", "pulau weh"] },
  { name: "Pulau Derawan", address: "Berau, Kalimantan Timur", rating: 4.8, userRatingsTotal: 5400, category: "Alam", lat: 2.2842, lng: 118.2417, tags: ["pulau", "diving", "kalimantan", "penyu"] },
  { name: "Kepulauan Togean", address: "Tojo Una-Una, Sulawesi Tengah", rating: 4.8, userRatingsTotal: 2900, category: "Petualangan", lat: -0.4167, lng: 122.0500, tags: ["pulau", "diving", "snorkeling", "sulawesi"] },
  { name: "Pantai Losari", address: "Makassar, Sulawesi Selatan", rating: 4.4, userRatingsTotal: 33000, category: "Kuliner", lat: -5.1431, lng: 119.4083, tags: ["pantai", "makassar", "kuliner", "pisang epe", "sunset"] },
  { name: "Bunaken", address: "Manado, Sulawesi Utara", rating: 4.7, userRatingsTotal: 8800, category: "Petualangan", lat: 1.6167, lng: 124.7500, tags: ["diving", "snorkeling", "manado", "taman laut"] },
  { name: "Pantai Ora", address: "Maluku Tengah, Maluku", rating: 4.8, userRatingsTotal: 2400, category: "Relaksasi", lat: -2.9667, lng: 129.5667, tags: ["pantai", "maluku", "snorkeling", "santai"] },
  { name: "Lembah Baliem", address: "Wamena, Papua", rating: 4.7, userRatingsTotal: 1800, category: "Budaya", lat: -4.0833, lng: 138.9500, tags: ["lembah", "papua", "suku dani", "budaya"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, searchQuery, limit, offset } = await req.json();
    const pageLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    const pageOffset = Math.max(0, Number(offset) || 0);

    let results = [...curatedPlaces];

    // Filter by category
    if (category && category !== "Semua") {
      results = results.filter((p) => p.category === category);
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          (p as any).tags?.some((t: string) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );

      // If no results from curated, try OpenStreetMap Nominatim
      if (results.length === 0) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery + " Indonesia"
          )}&format=json&limit=10&addressdetails=1`;

          const res = await fetch(nominatimUrl, {
            headers: { "User-Agent": "Tripsy/1.0" },
          });
          const data = await res.json();

          if (data && data.length > 0) {
            results = data.map((item: any) => ({
              name: item.display_name.split(",")[0],
              address: item.display_name.split(",").slice(1, 3).join(",").trim() || "Indonesia",
              rating: 4.5,
              userRatingsTotal: 1000,
              category: category !== "Semua" && category ? category : "Campuran",
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }));
          }
        } catch (e) {
          console.error("Nominatim search error:", e);
        }
      }
    }

    // Fallback to all curated if empty
    if (results.length === 0) {
      results = curatedPlaces;
    }

    const total = results.length;
    const paged = results.slice(pageOffset, pageOffset + pageLimit);

    // Only fetch photos for the current page so initial load stays fast
    const withPhotos = await Promise.all(
      paged.map(async (p) => {
        const galleryPhoto = await fetchCardGalleryPhoto(p.name);
        return { ...p, photoUrl: galleryPhoto || undefined };
      })
    );

    return new Response(JSON.stringify({ places: withPhotos, total, hasMore: pageOffset + paged.length < total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-places error:", e);
    return new Response(JSON.stringify({ places: [], total: 0, hasMore: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
