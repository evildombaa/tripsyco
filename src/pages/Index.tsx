import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PopularDestinations from "@/components/PopularDestinations";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PopularDestinations />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Index;
