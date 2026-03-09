import { MapPin, Star, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DestinationCardProps {
  name: string;
  address: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  category: string;
  lat?: number;
  lng?: number;
}

const DestinationCard = ({
  name,
  address,
  photoUrl,
  rating,
  userRatingsTotal,
  category,
  lat,
  lng,
}: DestinationCardProps) => {
  // Use coordinates for accurate Google Maps link, fallback to name search
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}`;

  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
      <Card className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={photoUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";
            }}
          />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">{category}</Badge>
          <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
            <ExternalLink className="h-3.5 w-3.5 text-foreground" />
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-lg line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
          {rating && (
            <div className="flex items-center gap-1.5 text-sm pt-2 border-t border-border/50">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="font-medium text-foreground">{rating}</span>
              {userRatingsTotal && (
                <span className="text-muted-foreground">({userRatingsTotal.toLocaleString()} ulasan)</span>
              )}
            </div>
          )}
        </div>
      </Card>
    </a>
  );
};

export default DestinationCard;
