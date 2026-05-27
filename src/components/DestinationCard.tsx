import { MapPin, Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams({
      name,
      address,
      category,
      ...(lat != null ? { lat: String(lat) } : {}),
      ...(lng != null ? { lng: String(lng) } : {}),
      ...(photoUrl ? { photo: photoUrl } : {}),
      ...(rating ? { rating: String(rating) } : {}),
      ...(userRatingsTotal ? { userRatingsTotal: String(userRatingsTotal) } : {}),
    });
    navigate(`/explore/detail?${params.toString()}`);
  };

  return (
    <button onClick={handleClick} className="group block text-left w-full">
      <div className="rounded-2xl overflow-hidden bg-card border border-border/50 hover-lift shadow-sm">
        <div className="relative px-4 pt-4 flex items-center justify-between">
          <Badge className="bg-muted text-foreground border-0 text-xs font-medium">
            {category}
          </Badge>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-4 space-y-2.5">
          <h3 className="font-bold text-foreground text-lg line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
          {rating && (
            <div className="flex items-center gap-2 text-sm pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="font-bold text-foreground">{rating}</span>
              </div>
              {userRatingsTotal && (
                <span className="text-muted-foreground text-xs">({userRatingsTotal.toLocaleString()} ulasan)</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default DestinationCard;
