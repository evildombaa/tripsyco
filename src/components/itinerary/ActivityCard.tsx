import { MapPin, Clock, Star, Trash2, GripVertical, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EnhancedItem {
  id: string;
  time: string;
  activity: string;
  location: string;
  status: string;
  description: string;
  image_url: string | null;
  rating: number | null;
  place_id: string | null;
  estimated_cost: number;
}

interface Props {
  item: EnhancedItem;
  onUpdate: (field: keyof EnhancedItem, value: string | number) => void;
  onRemove: () => void;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  must: { label: "Must", color: "bg-primary/10 text-primary border-primary/30" },
  want: { label: "Want", color: "bg-chart-1/10 text-chart-1 border-chart-1/30" },
  maybe: { label: "Maybe", color: "bg-muted text-muted-foreground border-border" },
};

const ActivityCard = ({ item, onUpdate, onRemove, onClick }: Props) => {
  const statusCfg = statusConfig[item.status] || statusConfig.want;

  return (
    <div className="group rounded-xl border border-border/40 hover:border-primary/30 bg-card transition-all overflow-hidden hover:shadow-sm">
      <div className="flex">
        {/* Thumbnail */}
        {item.image_url && (
          <div
            className="hidden sm:block w-20 h-full bg-muted bg-cover bg-center shrink-0 cursor-pointer"
            style={{ backgroundImage: `url(${item.image_url})` }}
            onClick={onClick}
          />
        )}

        <div className="flex-1 p-3.5">
          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-2.5">
            <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
            <Input
              type="time"
              value={item.time}
              onChange={(e) => onUpdate("time", e.target.value)}
              className="w-24 text-xs h-8 rounded-lg"
            />
            <Select value={item.status} onValueChange={(v) => onUpdate("status", v)}>
              <SelectTrigger className="w-20 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="must">Must</SelectItem>
                <SelectItem value="want">Want</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
              <p className="text-sm font-semibold text-foreground truncate">{item.activity || "Aktivitas"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.location || "Lokasi"}</span>
                {item.rating && (
                  <>
                    <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
                    <span>{item.rating}</span>
                  </>
                )}
              </div>
            </div>
            {item.estimated_cost > 0 && (
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
                Rp {item.estimated_cost.toLocaleString("id-ID")}
              </span>
            )}
            <button
              onClick={onRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mobile layout */}
          <div className="flex sm:hidden flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={item.time}
                  onChange={(e) => onUpdate("time", e.target.value)}
                  className="w-24 text-xs h-8 rounded-lg"
                />
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-md ${statusCfg.color}`}>
                  {statusCfg.label}
                </Badge>
              </div>
              <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="cursor-pointer" onClick={onClick}>
              {item.image_url && (
                <img src={item.image_url} alt={item.activity} className="w-full h-28 object-cover rounded-lg mb-2" />
              )}
              <p className="text-sm font-semibold text-foreground">{item.activity || "Aktivitas"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{item.location || "Lokasi"}</span>
                {item.rating && (
                  <>
                    <Star className="h-3 w-3 text-primary fill-primary" />
                    <span>{item.rating}</span>
                  </>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
            {item.estimated_cost > 0 && (
              <p className="text-xs font-semibold text-muted-foreground">
                Estimasi: Rp {item.estimated_cost.toLocaleString("id-ID")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
