import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-foreground/40" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-serif text-primary-foreground mb-6 leading-tight">
          Jelajahi Dunia <br />
          <span className="text-primary-foreground/80">Sesuai Gayamu</span>
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
          Rencanakan perjalanan impianmu dengan mudah. Temukan destinasi, susun itinerary, dan nikmati petualangan tanpa ribet.
        </p>

        <form
          onSubmit={handleSearch}
          className="max-w-2xl mx-auto bg-card/95 backdrop-blur-md rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-xl"
        >
          <div className="flex-1 flex items-center gap-3 px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Mau ke mana? Cari destinasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            />
          </div>
          <Button type="submit" size="lg" className="rounded-xl">
            Cari Destinasi
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-primary-foreground/80">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            <span>500+ Destinasi</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>Itinerary Personal</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
