import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DestinationCard from "@/components/DestinationCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Place {
  name: string;
  address: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  category: string;
  placeId: string;
}

const fallbackPlaces: Place[] = [
  { name: "Tanah Lot", address: "Tabanan, Bali, Indonesia", rating: 4.6, userRatingsTotal: 48200, category: "Budaya", placeId: "ChIJm8w2en1G0i0RMBqEbF1fRfU" },
  { name: "Tegallalang Rice Terrace", address: "Tegallalang, Gianyar, Bali", rating: 4.5, userRatingsTotal: 32100, category: "Alam", placeId: "ChIJW2v5bKxJ0i0RhKMb3387bKk" },
  { name: "Candi Borobudur", address: "Magelang, Jawa Tengah, Indonesia", rating: 4.7, userRatingsTotal: 65000, category: "Budaya", placeId: "ChIJf-UWJaBYei4RSwIBbwVfJaE" },
  { name: "Kawah Ijen", address: "Banyuwangi, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 18500, category: "Petualangan", placeId: "ChIJK2FPsINb1y0R7qqn1sXQHLw" },
  { name: "Nusa Penida", address: "Klungkung, Bali, Indonesia", rating: 4.8, userRatingsTotal: 12000, category: "Alam", placeId: "ChIJjzPgsSk70i0ROFqYRDF6dXI" },
  { name: "Malioboro", address: "Yogyakarta, Indonesia", rating: 4.5, userRatingsTotal: 52000, category: "Kuliner", placeId: "ChIJB9-MlZFYei4RFKaIwGLEfHo" },
  { name: "Pantai Kuta", address: "Kuta, Badung, Bali", rating: 4.4, userRatingsTotal: 41000, category: "Relaksasi", placeId: "ChIJL3G7sDBG0i0RlyFWSlqLsAg" },
  { name: "Taman Nasional Komodo", address: "Manggarai Barat, NTT, Indonesia", rating: 4.8, userRatingsTotal: 9500, category: "Petualangan", placeId: "ChIJi0qTQOuPqy0RZOspMhmUkEI" },
  { name: "Gunung Bromo", address: "Probolinggo, Jawa Timur, Indonesia", rating: 4.7, userRatingsTotal: 28000, category: "Alam", placeId: "ChIJaYlbcBzc1y0RmvWcNkHMmQo" },
  { name: "Danau Toba", address: "Sumatera Utara, Indonesia", rating: 4.7, userRatingsTotal: 15000, category: "Alam", placeId: "ChIJN2lBUi7tMTARQx0OxhHf2EQ" },
  { name: "Ubud Monkey Forest", address: "Ubud, Gianyar, Bali", rating: 4.5, userRatingsTotal: 38000, category: "Alam", placeId: "ChIJJzkVqaxJ0i0RxGGLKAqbg3c" },
  { name: "Raja Ampat", address: "Raja Ampat, Papua Barat, Indonesia", rating: 4.9, userRatingsTotal: 5200, category: "Alam", placeId: "ChIJv2fzmCa3uy0RPP_rIcN8VCk" },
];

const categories = ["Semua", "Alam", "Kuliner", "Budaya", "Petualangan", "Relaksasi"];

const Explore = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [places, setPlaces] = useState<Place[]>(fallbackPlaces);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Try fetching from Google Maps, fallback to hardcoded
  useEffect(() => {
    fetchPlaces();
  }, [activeCategory]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      let userPrefs: Record<string, string> = {};

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explore-places`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            category: activeCategory,
            preferences: userPrefs,
            searchQuery: query || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.places && data.places.length > 0) {
          setPlaces(data.places);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching places:", error);
    }

    // Fallback
    let filtered = fallbackPlaces;
    if (activeCategory !== "Semua") {
      filtered = fallbackPlaces.filter((p) => p.category === activeCategory);
      if (filtered.length === 0) filtered = fallbackPlaces;
    }
    setPlaces(filtered);
    setLoading(false);
  };

  const displayed = query
    ? places.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase())
      )
    : places;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-6">Jelajahi Destinasi</h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari destinasi atau kota..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchPlaces();
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayed.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((place) => (
                <DestinationCard key={place.placeId} {...place} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Tidak ada destinasi yang ditemukan.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Explore;
