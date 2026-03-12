import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EnhancedItem } from "./ActivityCard";

interface Props {
  dayLocation: string;
  dayDate: string;
  budgetRemaining: number;
  existingActivities: EnhancedItem[];
  destination: string;
  onGenerated: (items: EnhancedItem[]) => void;
}

const SmartGeneratePopover = ({
  dayLocation,
  dayDate,
  budgetRemaining,
  existingActivities,
  destination,
  onGenerated,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const hasDate = !!dayDate;
  const hasLocation = !!dayLocation;
  const canGenerate = hasDate && hasLocation;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);
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
            location: dayLocation,
            time_slot_start: startTime,
            time_slot_end: endTime,
            budget_remaining: budgetRemaining,
            existing_activities: existingActivities,
            date: dayDate,
            destination,
            mode: "full_day",
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal generate rekomendasi");
      }

      const data = await res.json();
      setResult(data);

      const items: EnhancedItem[] = (data.recommendations || []).map((rec: any, i: number) => ({
        id: `gen-${Date.now()}-${i}`,
        time: rec.time || "",
        activity: rec.activity || "",
        location: rec.location || "",
        status: rec.status || "want",
        description: rec.description || "",
        image_url: rec.photo_url || null,
        rating: rec.rating || null,
        place_id: rec.place_id || null,
        estimated_cost: rec.estimated_cost || 0,
      }));

      onGenerated(items);
      toast({ title: "Jadwal berhasil di-generate! 🎉" });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Gagal generate", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          Generate Jadwal
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">Generate Jadwal Otomatis</h4>
            <p className="text-xs text-muted-foreground">
              AI akan membuat jadwal berdasarkan lokasi, tanggal, budget, cuaca, dan event lokal
            </p>
          </div>

          {!hasDate && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Masukkan <strong>tanggal</strong> hari ini terlebih dahulu. Tanggal diperlukan untuk mempertimbangkan hari besar, event lokal, dan kepadatan wisata.
              </p>
            </div>
          )}

          {!hasLocation && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Masukkan <strong>lokasi</strong> hari ini terlebih dahulu.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Mulai</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Selesai</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate
              </>
            )}
          </Button>

          {result && (
            <div className="text-xs space-y-1 border-t border-border pt-2">
              {result.weather_prediction && (
                <p className="text-muted-foreground">🌤 {result.weather_prediction}</p>
              )}
              {result.local_events && result.local_events !== "Tidak ada event khusus" && (
                <p className="text-muted-foreground">🎉 {result.local_events}</p>
              )}
              {result.budget_summary && (
                <p className={result.budget_summary.status === "over_budget" ? "text-destructive" : "text-primary"}>
                  💰 {result.budget_summary.status === "over_budget"
                    ? `Kelebihan Rp ${Math.abs(result.budget_summary.difference).toLocaleString("id-ID")}`
                    : `Sisa Rp ${result.budget_summary.remaining?.toLocaleString("id-ID")}`}
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SmartGeneratePopover;
