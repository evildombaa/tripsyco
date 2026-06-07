import { MapPin, Star, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AddToItineraryDialog from "@/components/itinerary/AddToItineraryDialog";

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
  const [addOpen, setAddOpen] = useState(false);

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
    <div className="group block text-left w-full">
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
        className="rounded-2xl overflow-hidden bg-card border border-border/50 hover-lift shadow-sm cursor-pointer"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {photoUrl && (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Badge className="absolute top-3.5 left-3.5 bg-card/80 backdrop-blur-sm text-foreground border-0 text-xs font-medium">
            {category}
          </Badge>
          <div className="absolute top-3.5 right-3.5 bg-card/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3.5 w-3.5 text-foreground" />
          </div>
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
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={(e) => { e.stopPropagation(); setAddOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah ke Itinerary
          </Button>
        </div>
      </div>
      <AddToItineraryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        place={{ name, address, photoUrl, rating, category }}
      />
    </div>
  );
};

export default DestinationCard;
