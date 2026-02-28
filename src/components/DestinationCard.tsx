import { MapPin, Clock, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DestinationCardProps {
  name: string;
  location: string;
  image: string;
  price: string;
  hours: string;
  category: string;
}

const DestinationCard = ({ name, location, image, price, hours, category }: DestinationCardProps) => {
  return (
    <Card className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
          {category}
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground text-lg">{name}</h3>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="h-3.5 w-3.5" />
          <span>{location}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            <span>{price}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{hours}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DestinationCard;
