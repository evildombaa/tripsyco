import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DestinationCard from "@/components/DestinationCard";
import destBali from "@/assets/dest-bali.jpg";
import destRajaAmpat from "@/assets/dest-raja-ampat.jpg";
import destYogyakarta from "@/assets/dest-yogyakarta.jpg";
import destLabuanBajo from "@/assets/dest-labuan-bajo.jpg";

const allDestinations = [
  { name: "Ubud, Bali", location: "Bali, Indonesia", image: destBali, price: "Rp 50.000", hours: "08:00 - 18:00", category: "Alam" },
  { name: "Raja Ampat", location: "Papua Barat, Indonesia", image: destRajaAmpat, price: "Rp 500.000", hours: "06:00 - 17:00", category: "Bahari" },
  { name: "Candi Borobudur", location: "Yogyakarta, Indonesia", image: destYogyakarta, price: "Rp 50.000", hours: "06:00 - 17:00", category: "Budaya" },
  { name: "Labuan Bajo", location: "NTT, Indonesia", image: destLabuanBajo, price: "Rp 150.000", hours: "07:00 - 17:00", category: "Petualangan" },
  { name: "Nusa Penida", location: "Bali, Indonesia", image: destBali, price: "Rp 25.000", hours: "07:00 - 18:00", category: "Bahari" },
  { name: "Prambanan", location: "Yogyakarta, Indonesia", image: destYogyakarta, price: "Rp 50.000", hours: "06:00 - 17:00", category: "Budaya" },
];

const categories = ["Semua", "Alam", "Bahari", "Budaya", "Petualangan"];

const Explore = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("Semua");

  const filtered = allDestinations.filter((d) => {
    const matchesQuery = d.name.toLowerCase().includes(query.toLowerCase()) || d.location.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === "Semua" || d.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

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
                placeholder="Cari destinasi..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((dest) => (
                <DestinationCard key={dest.name} {...dest} />
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
