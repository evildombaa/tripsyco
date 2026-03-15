import { Search, CalendarDays, Bell, Share2, Wallet } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Pencarian Personal",
    description: "Temukan tempat wisata sesuai minat, lengkap dengan info HTM, akses, dan jam operasional.",
    gradient: "from-primary/10 to-accent",
  },
  {
    icon: CalendarDays,
    title: "Itinerary Pintar",
    description: "Susun rencana perjalanan yang disesuaikan dengan preferensi dan waktu kamu.",
    gradient: "from-chart-2/10 to-chart-2/5",
  },
  {
    icon: Bell,
    title: "Notifikasi Perjalanan",
    description: "Jangan lewatkan jadwal dan aktivitas penting selama perjalananmu.",
    gradient: "from-chart-5/10 to-chart-5/5",
  },
  {
    icon: Share2,
    title: "Berbagi Rencana",
    description: "Bagikan itinerary dengan teman, keluarga, atau mitra travel lokal.",
    gradient: "from-chart-3/10 to-chart-3/5",
  },
  {
    icon: Wallet,
    title: "Catat Pengeluaran",
    description: "Kontrol biaya perjalanan agar lebih transparan dan terencana.",
    gradient: "from-chart-4/10 to-chart-4/5",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Fitur</p>
          <h2 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground mb-4 leading-tight">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Tripsy hadir dengan fitur lengkap untuk perjalanan yang lebih mudah.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group p-7 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-border/30 hover-lift cursor-default`}
            >
              <div className="w-12 h-12 rounded-xl bg-card shadow-sm flex items-center justify-center mb-5 group-hover:shadow-md transition-shadow">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
