import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DestinationCard from "@/components/DestinationCard";
import { supabase } from "@/integrations/supabase/client";

interface Place {
  name: string;
  address: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  category: string;
  lat?: number;
  lng?: number;
}

const categories = ["Semua", "Alam", "Kuliner", "Budaya", "Petualangan", "Relaksasi"];

const Explore = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, [activeCategory]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("explore-places", {
        body: {
          category: activeCategory,
          searchQuery: query || undefined,
        },
      });

      if (!error && data?.places && data.places.length > 0) {
        setPlaces(data.places);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    fetchPlaces();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Discover</p>
            <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground">Jelajahi Destinasi</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari destinasi atau kota..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "gradient-primary border-0 text-primary-foreground shadow-sm"
                    : "hover:bg-muted"
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Mencari destinasi...</p>
            </div>
          ) : places.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
              {places.map((place, idx) => (
                <DestinationCard key={`${place.name}-${idx}`} {...place} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">Tidak ada destinasi yang ditemukan.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Explore;
