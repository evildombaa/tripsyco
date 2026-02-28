import DestinationCard from "./DestinationCard";
import destBali from "@/assets/dest-bali.jpg";
import destRajaAmpat from "@/assets/dest-raja-ampat.jpg";
import destYogyakarta from "@/assets/dest-yogyakarta.jpg";
import destLabuanBajo from "@/assets/dest-labuan-bajo.jpg";

const destinations = [
  {
    name: "Ubud, Bali",
    location: "Bali, Indonesia",
    image: destBali,
    price: "Rp 50.000",
    hours: "08:00 - 18:00",
    category: "Alam",
  },
  {
    name: "Raja Ampat",
    location: "Papua Barat, Indonesia",
    image: destRajaAmpat,
    price: "Rp 500.000",
    hours: "06:00 - 17:00",
    category: "Bahari",
  },
  {
    name: "Candi Borobudur",
    location: "Yogyakarta, Indonesia",
    image: destYogyakarta,
    price: "Rp 50.000",
    hours: "06:00 - 17:00",
    category: "Budaya",
  },
  {
    name: "Labuan Bajo",
    location: "NTT, Indonesia",
    image: destLabuanBajo,
    price: "Rp 150.000",
    hours: "07:00 - 17:00",
    category: "Petualangan",
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-2">
              Destinasi Populer
            </h2>
            <p className="text-muted-foreground">Tempat-tempat favorit yang wajib kamu kunjungi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((dest) => (
            <DestinationCard key={dest.name} {...dest} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
