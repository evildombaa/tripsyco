import { MapPin, Star, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
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
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-2">Destinasi Populer</h2>
            <p className="text-muted-foreground">Tempat-tempat favorit yang wajib kamu kunjungi.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((dest) => (
            <a key={dest.name} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.query)}`} target="_blank" rel="noopener noreferrer">
              <Card className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">{dest.category}</Badge>
                  <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-foreground" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">{dest.name}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{dest.address}</span>
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
