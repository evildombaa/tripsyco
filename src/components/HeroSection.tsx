import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, Sparkles } from "lucide-react";
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
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

      <div className="relative z-10 container mx-auto px-4 text-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 text-primary-foreground text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>AI-powered travel planner</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold font-serif text-primary-foreground mb-6 leading-[1.1] tracking-tight">
          Jelajahi Dunia
          <br />
          <span className="text-primary-foreground/70">Sesuai Gayamu</span>
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
          Rencanakan perjalanan impianmu dengan AI. Temukan destinasi, susun itinerary, dan nikmati petualangan tanpa ribet.
        </p>

        <form
          onSubmit={handleSearch}
          className="max-w-xl mx-auto glass-strong rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl"
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
          <Button type="submit" size="lg" className="rounded-xl gradient-primary border-0 shadow-md hover:shadow-lg transition-all font-semibold">
            Cari
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-8 mt-10 text-primary-foreground/70">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="p-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span>500+ Destinasi</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="p-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <span>Itinerary Personal</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="p-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span>AI Assistant</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
