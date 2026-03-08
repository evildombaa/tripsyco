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

const categoryQueries: Record<string, string> = {
  Alam: "tempat wisata alam",
  Kuliner: "restoran populer",
  Budaya: "tempat wisata budaya",
  Petualangan: "aktivitas outdoor petualangan",
  Relaksasi: "spa resort relaksasi",
};

const categories = ["Semua", "Alam", "Kuliner", "Budaya", "Petualangan", "Relaksasi"];

const Explore = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrefs, setUserPrefs] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Load user preferences from onboarding
  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      const { data } = await supabase
        .from("onboarding_responses")
        .select("travel_purpose, preferred_activity, budget_preference")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setUserPrefs(data as Record<string, string>);
    };
    loadPrefs();
  }, [user]);

  // Fetch places from edge function
  useEffect(() => {
    fetchPlaces();
  }, [activeCategory, userPrefs]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
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
      if (!res.ok) throw new Error("Failed to fetch places");
      const data = await res.json();
      setPlaces(data.places || []);
    } catch (error) {
      console.error("Error fetching places:", error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces();
  };

  const filtered = query
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

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari destinasi atau kota..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchPlaces(); }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
            </div>
          </form>

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
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((place) => (
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
