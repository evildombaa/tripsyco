import { Search, CalendarDays, Bell, Share2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Pencarian Personal",
    description: "Temukan tempat wisata sesuai minat, lengkap dengan info HTM, akses, dan jam operasional.",
  },
  {
    icon: CalendarDays,
    title: "Itinerary Pintar",
    description: "Susun rencana perjalanan yang disesuaikan dengan preferensi dan waktu kamu.",
  },
  {
    icon: Bell,
    title: "Notifikasi Perjalanan",
    description: "Jangan lewatkan jadwal dan aktivitas penting selama perjalananmu.",
  },
  {
    icon: Share2,
    title: "Berbagi Rencana",
    description: "Bagikan itinerary dengan teman, keluarga, atau mitra travel lokal.",
  },
  {
    icon: Wallet,
    title: "Catat Pengeluaran",
    description: "Kontrol biaya perjalanan agar lebih transparan dan terencana.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tripsy.co hadir dengan fitur lengkap untuk membuat perjalananmu lebih mudah dan menyenangkan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="p-6 border-border/50 hover:shadow-md transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
