import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, ExternalLink, Clock, Globe, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  author: string;
  rating: number;
  text: string;
  time: string;
}

interface NearbyPlace {
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string | null;
  lat?: number;
  lng?: number;
}

interface PlaceDetails {
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  description?: string | null;
  photos: string[];
  reviews: Review[];
  website?: string | null;
  mapsUrl?: string | null;
  openingHours?: string[] | null;
  lat: number;
  lng: number;
  nearbyHotels: NearbyPlace[];
  nearbyAttractions: NearbyPlace[];
}

const transportPlatforms = [
  { name: "Traveloka", url: "https://www.traveloka.com", description: "Tiket pesawat, hotel, dan aktivitas wisata", color: "bg-blue-500" },
  { name: "Tiket.com", url: "https://www.tiket.com", description: "Booking pesawat, kereta, dan hotel", color: "bg-sky-500" },
  { name: "PegiPegi", url: "https://www.pegipegi.com", description: "Tiket pesawat dan kereta api", color: "bg-emerald-500" },
  { name: "Agoda", url: "https://www.agoda.com", description: "Hotel dan penginapan terbaik", color: "bg-red-500" },
];

const DestinationDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [heroPhoto, setHeroPhoto] = useState<string>("");

  const name = searchParams.get("name") || "";
  const lat = searchParams.get("lat") || "0";
  const lng = searchParams.get("lng") || "0";
  const fallbackPhoto = searchParams.get("photo") || "";
  const category = searchParams.get("category") || "";

  useEffect(() => {
    if (name) fetchDetails();
  }, [name]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("place-details", {
        body: { name, lat: parseFloat(lat), lng: parseFloat(lng) },
      });

      const hasRealData = !error && data && !data.error && (data.description || data.photos?.length > 0 || data.nearbyHotels?.length > 0 || data.nearbyAttractions?.length > 0);
      
      if (hasRealData) {
        // Merge URL params data with API data for completeness
        setDetails({
          ...data,
          address: data.address || searchParams.get("address") || "",
          rating: data.rating || (parseFloat(searchParams.get("rating") || "0") || undefined),
          userRatingsTotal: data.userRatingsTotal || (parseInt(searchParams.get("userRatingsTotal") || "0") || undefined),
        });
        setHeroPhoto(data.photos?.[0] || fallbackPhoto);
      } else {
        // Use data from URL params as fallback
        const mapsUrl = `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`;
        setDetails({
          name,
          address: searchParams.get("address") || "",
          rating: parseFloat(searchParams.get("rating") || "0") || undefined,
          userRatingsTotal: parseInt(searchParams.get("userRatingsTotal") || "0") || undefined,
          description: null,
          photos: fallbackPhoto ? [fallbackPhoto] : [],
          reviews: [],
          website: null,
          mapsUrl,
          openingHours: null,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          nearbyHotels: [],
          nearbyAttractions: [],
        });
        setHeroPhoto(fallbackPhoto);
      }
    } catch (e) {
      console.error("Error fetching details:", e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat detail destinasi...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!details) return null;

  const allPhotos = details.photos.length > 0 ? details.photos : (fallbackPhoto ? [fallbackPhoto] : []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img
          src={heroPhoto || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80"}
          alt={details.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        <div className="absolute top-24 left-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="bg-card/80 backdrop-blur-sm border-border/50"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 container mx-auto px-6">
          {category && (
            <Badge className="mb-3 bg-primary/90 text-primary-foreground border-0">{category}</Badge>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground drop-shadow-lg">{details.name}</h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{details.address}</span>
            </div>
            {details.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-bold text-foreground">{details.rating}</span>
                {details.userRatingsTotal && (
                  <span className="text-muted-foreground text-sm">({details.userRatingsTotal.toLocaleString()} ulasan)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10 space-y-12">
        {/* Photo Gallery */}
        {allPhotos.length > 1 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Galeri Foto</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {allPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedPhoto(idx); setHeroPhoto(photo); }}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedPhoto === idx ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${details.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";
                    }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Description & Info */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {details.description && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">Tentang Tempat Ini</h2>
                <p className="text-muted-foreground leading-relaxed">{details.description}</p>
              </section>
            )}

            {/* Reviews */}
            {details.reviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">Ulasan Pengunjung</h2>
                <div className="space-y-4">
                  {details.reviews.map((review, idx) => (
                    <Card key={idx} className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground text-sm">{review.author}</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-3">{review.text}</p>
                        <p className="text-xs text-muted-foreground/60 mt-2">{review.time}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {details.openingHours && (
              <Card className="bg-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Jam Operasional</h3>
                  </div>
                  <div className="space-y-1">
                    {details.openingHours.map((h, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{h}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(details.website || details.mapsUrl) && (
              <Card className="bg-card border-border/50">
                <CardContent className="p-4 space-y-2">
                  {details.website && (
                    <a href={details.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="h-4 w-4" /> Website Resmi
                    </a>
                  )}
                  {details.mapsUrl && (
                    <a href={details.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <MapPin className="h-4 w-4" /> Buka di Google Maps
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Transport Platforms */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-foreground text-sm">Pesan Tiket & Transportasi</h3>
                </div>
                <div className="space-y-2">
                  {transportPlatforms.map((p) => (
                    <a
                      key={p.name}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default DestinationDetail;
