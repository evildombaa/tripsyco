import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Star, Search, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EnhancedItem } from "./ActivityCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  dayLocation: string;
  dayDate: string;
  budgetRemaining: number;
  existingActivities: EnhancedItem[];
  destination: string;
  onAdd: (item: EnhancedItem) => void;
}

interface PlaceSuggestion {
  activity: string;
  location: string;
  description: string;
  rating: number | null;
  photo_url: string | null;
  place_id: string | null;
  estimated_cost: number;
  category: string;
}

const AddActivityDialog = ({
  open,
  onClose,
  dayLocation,
  dayDate,
  budgetRemaining,
  existingActivities,
  destination,
  onAdd,
}: Props) => {
  const [time, setTime] = useState("09:00");
  const [status, setStatus] = useState("want");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);
  const { toast } = useToast();

  const fetchSuggestions = async (query?: string) => {
    const locationToUse = dayLocation || destination;
    if (!locationToUse) {
      toast({ title: "Tujuan belum ditentukan", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSelected(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-recommend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            location: locationToUse,
            date: dayDate,
            budget_remaining: budgetRemaining,
            existing_activities: existingActivities,
            destination,
            mode: "suggestions",
            time_slot_start: time,
            search_query: query || searchQuery || undefined,
          }),
        }
      );

      if (!res.ok) throw new Error("Gagal memuat rekomendasi");

      const data = await res.json();
      setSuggestions((data.recommendations || []).slice(0, 5));
    } catch (error: any) {
      toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selected) {
      toast({ title: "Pilih aktivitas terlebih dahulu", variant: "destructive" });
      return;
    }

    const item: EnhancedItem = {
      id: Date.now().toString(),
      time,
      activity: selected.activity,
      location: selected.location,
      status,
      description: selected.description,
      image_url: selected.photo_url,
      rating: selected.rating,
      place_id: selected.place_id,
      estimated_cost: selected.estimated_cost,
    };

    onAdd(item);
    // Reset
    setSelected(null);
    setSuggestions([]);
    setSearchQuery("");
    onClose();
  };

  // Reset state when dialog opens — do NOT auto-fetch
  useEffect(() => {
    if (open) {
      setSuggestions([]);
      setSelected(null);
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-lg">Tambah Aktivitas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0 px-1">
          {/* Time & Status */}
          <div className="flex gap-3 px-px">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Waktu</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="must">Must</SelectItem>
                  <SelectItem value="want">Want</SelectItem>
                  <SelectItem value="maybe">Maybe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 px-px">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aktivitas atau tempat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSuggestions()}
                className="pl-8 h-9"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchSuggestions()} disabled={loading} className="h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
            </Button>
          </div>

          {/* Suggestions list */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] px-px">
            {loading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Mencari rekomendasi...
              </div>
            )}

            {!loading && suggestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Semua aktivitas akan muncul di sini.
                <br />
                Ketik tempat lalu klik "Cari" untuk memulai.
              </div>
            )}

            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelected(s)}
                className={`w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 ${
                  selected === s
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50"
                }`}
              >
                <div className="flex gap-3">
                  {s.photo_url && (
                    <img
                      src={s.photo_url}
                      alt={s.activity}
                      className="w-16 h-16 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{s.activity}</p>
                      {s.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-primary shrink-0">
                          <Star className="h-3 w-3 fill-primary" />
                          {s.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.location}</span>
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                    )}
                    {s.estimated_cost > 0 && (
                      <p className="text-xs text-primary mt-1">
                        Rp {s.estimated_cost.toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Add button */}
          <Button onClick={handleAdd} disabled={!selected} className="w-full">
            Tambahkan Aktivitas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
