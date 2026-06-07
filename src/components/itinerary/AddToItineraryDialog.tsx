import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PlacePayload {
  name: string;
  address?: string;
  photoUrl?: string | null;
  rating?: number | null;
  placeId?: string | null;
  category?: string;
  estimatedCost?: number;
  description?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  place: PlacePayload;
}

interface Itinerary {
  id: string;
  trip_name: string;
}

interface Day {
  id: string;
  trip_date: string | null;
  sort_order: number;
  location: string | null;
}

const formatDayLabel = (d: Day) => {
  if (d.trip_date) {
    try {
      return new Date(d.trip_date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d.trip_date;
    }
  }
  return `Hari ${d.sort_order + 1}`;
};

const AddToItineraryDialog = ({ open, onClose, place }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [itineraryId, setItineraryId] = useState<string>("");
  const [dayId, setDayId] = useState<string>("");
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast({ title: "Silakan login terlebih dahulu", variant: "destructive" });
        onClose();
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase
        .from("itineraries")
        .select("id, trip_name")
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast({ title: "Gagal memuat itinerary", description: error.message, variant: "destructive" });
      } else {
        setItineraries(data || []);
        if (data && data.length > 0) setItineraryId(data[0].id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!itineraryId) {
      setDays([]);
      setDayId("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("itinerary_days")
        .select("id, trip_date, sort_order, location")
        .eq("itinerary_id", itineraryId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast({ title: "Gagal memuat hari", description: error.message, variant: "destructive" });
        return;
      }
      setDays(data || []);
      setDayId(data?.[0]?.id || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [itineraryId]);

  const handleSave = async () => {
    if (!dayId) {
      toast({ title: "Pilih hari terlebih dahulu", variant: "destructive" });
      return;
    }
    setSaving(true);
    // Determine sort_order: append at end
    const { data: existing } = await supabase
      .from("itinerary_day_items")
      .select("sort_order")
      .eq("day_id", dayId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("itinerary_day_items").insert({
      day_id: dayId,
      time_slot: time,
      activity: place.name,
      location: place.address || place.name,
      description: place.description || null,
      image_url: place.photoUrl || null,
      rating: place.rating ?? null,
      place_id: place.placeId ?? null,
      estimated_cost: place.estimatedCost ?? 0,
      status: "want",
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Aktivitas ditambahkan ke itinerary" });
    onClose();
  };

  const noItinerary = !loading && itineraries.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambahkan ke Itinerary</DialogTitle>
          <DialogDescription className="line-clamp-1">{place.name}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Memuat...
          </div>
        ) : noItinerary ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Anda belum memiliki itinerary. Buat itinerary terlebih dahulu.
            </p>
            <Button onClick={() => { onClose(); navigate("/itinerary"); }}>
              <Plus className="h-4 w-4 mr-1" /> Buat Itinerary
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Itinerary</Label>
              <Select value={itineraryId} onValueChange={setItineraryId}>
                <SelectTrigger><SelectValue placeholder="Pilih itinerary" /></SelectTrigger>
                <SelectContent>
                  {itineraries.map((it) => (
                    <SelectItem key={it.id} value={it.id}>{it.trip_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Hari / Tanggal</Label>
              <Select value={dayId} onValueChange={setDayId} disabled={days.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={days.length === 0 ? "Belum ada hari" : "Pilih hari"} />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{formatDayLabel(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Jam</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
              <Button onClick={handleSave} disabled={saving || !dayId}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Tambahkan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToItineraryDialog;