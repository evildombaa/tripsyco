import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, RotateCcw, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { V2Preferences } from "@/pages/ItineraryV2";

interface ItineraryDay {
  date: string;
  date_label: string;
  items: {
    time: string;
    activity: string;
    location: string;
    description: string;
    estimated_cost: number;
    rating?: number;
    photo_url?: string;
  }[];
}

interface Props {
  itinerary: { trip_name: string; days: ItineraryDay[] };
  preferences: V2Preferences;
  onReset: () => void;
}

const ItineraryV2Result = ({ itinerary, preferences, onReset }: Props) => {
  const totalCost = itinerary.days.reduce(
    (sum, d) => sum + d.items.reduce((s, i) => s + (i.estimated_cost || 0), 0), 0
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{itinerary.trip_name}</h1>
        <p className="text-muted-foreground">
          {preferences.destination} • {preferences.date_start} – {preferences.date_end}
        </p>
        <p className="text-sm text-primary font-medium mt-1">
          Total estimasi: Rp {totalCost.toLocaleString("id-ID")}
        </p>
      </div>

      <div className="space-y-6">
        {itinerary.days.map((day, dayIdx) => (
          <div key={dayIdx} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="bg-primary/5 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">{day.date_label}</h3>
              </div>
            </div>
            <div className="divide-y divide-border">
              {day.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-4 p-4">
                  {item.photo_url && (
                    <img src={item.photo_url} alt={item.location} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-primary">{item.time}</span>
                      {item.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {item.rating}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground">{item.activity}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.estimated_cost > 0 && (
                      <p className="text-xs text-primary mt-1">Rp {item.estimated_cost.toLocaleString("id-ID")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Buat Itinerary Baru
        </Button>
      </div>
    </div>
  );
};

export default ItineraryV2Result;
