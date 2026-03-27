import heroImage from "@/assets/hero-travel.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-end overflow-hidden">
      <img
        src={heroImage}
        alt="Pemandangan tebing dan pantai Indonesia"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-6 md:px-12 pb-20 md:pb-28 max-w-5xl mr-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-serif text-white leading-[1.05] tracking-tight mb-4">
          Jelajahi
          <br />
          Keajaiban Dunia
        </h1>

        <p className="text-white/60 text-sm md:text-base tracking-[0.35em] uppercase font-medium mb-6">
          Indonesia
        </p>

        <p className="text-white/80 text-base md:text-lg max-w-md leading-relaxed font-light italic">
          Langkah pertama menuju
          <br />
          petualangan tak terlupakan
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
