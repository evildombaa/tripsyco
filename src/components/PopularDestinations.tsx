import { MapPin, ExternalLink, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import destBali from "@/assets/dest-bali.jpg";
import destRajaAmpat from "@/assets/dest-raja-ampat.jpg";
import destYogyakarta from "@/assets/dest-yogyakarta.jpg";
import destLabuanBajo from "@/assets/dest-labuan-bajo.jpg";

const destinations = [
  { name: "Ubud, Bali", address: "Bali, Indonesia", image: destBali, category: "Alam", query: "Ubud Bali" },
  { name: "Raja Ampat", address: "Papua Barat, Indonesia", image: destRajaAmpat, category: "Bahari", query: "Raja Ampat" },
  { name: "Candi Borobudur", address: "Yogyakarta, Indonesia", image: destYogyakarta, category: "Budaya", query: "Candi Borobudur" },
  { name: "Labuan Bajo", address: "NTT, Indonesia", image: destLabuanBajo, category: "Petualangan", query: "Labuan Bajo" },
];

const PopularDestinations = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Populer</p>
            <h2 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground leading-tight">
              Destinasi Favorit
            </h2>
          </div>
          <a href="/explore" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-3 transition-all">
            Lihat semua <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {destinations.map((dest) => (
            <a
              key={dest.name}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative rounded-2xl overflow-hidden hover-lift bg-card shadow-sm">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                  <Badge className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm text-foreground border-0 font-medium text-xs">
                    {dest.category}
                  </Badge>
                  <div className="absolute top-4 right-4 bg-card/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-bold text-primary-foreground text-lg mb-1">{dest.name}</h3>
                    <div className="flex items-center gap-1.5 text-primary-foreground/80 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{dest.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
