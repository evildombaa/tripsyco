import { useState } from "react";
import { Plus, Calendar, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BudgetInput from "@/components/itinerary/BudgetInput";
import ActivityCard, { EnhancedItem } from "@/components/itinerary/ActivityCard";
import ActivityDetailDialog from "@/components/itinerary/ActivityDetailDialog";
import SmartGeneratePopover from "@/components/itinerary/SmartGeneratePopover";
import { useToast } from "@/hooks/use-toast";

export interface DayPlan {
  id: string;
  date: string;
  location: string;
  items: EnhancedItem[];
}

interface Props {
  tripName: string;
  setTripName: (v: string) => void;
  days: DayPlan[];
  setDays: (d: DayPlan[]) => void;
  budget: number;
  setBudget: (v: number) => void;
  destination: string;
  onSave?: () => void;
  saving?: boolean;
}

const ItineraryEditor = ({ tripName, setTripName, days, setDays, budget, setBudget, destination, onSave, saving }: Props) => {
  const [selectedItem, setSelectedItem] = useState<{ dayId: string; item: EnhancedItem } | null>(null);
  const { toast } = useToast();

  const totalEstimatedCost = days.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + (item.estimated_cost || 0), 0),
    0
  );

  const addDay = () => {
    setDays([...days, { id: Date.now().toString(), date: "", location: "", items: [] }]);
  };

  const addItem = (dayId: string) => {
    // When adding, trigger single recommendation if location exists
    const day = days.find((d) => d.id === dayId);
    const newItem: EnhancedItem = {
      id: Date.now().toString(),
      time: "",
      activity: "",
      location: "",
      status: "want",
      description: "",
      image_url: null,
      rating: null,
      place_id: null,
      estimated_cost: 0,
    };

    if (day?.location && day.items.length > 0) {
      // Auto-recommend
      const lastItem = day.items[day.items.length - 1];
      fetchSingleRecommendation(dayId, day.location, day.date, lastItem, newItem);
    } else {
      setDays(days.map((d) => (d.id === dayId ? { ...d, items: [...d.items, newItem] } : d)));
    }
  };

  const fetchSingleRecommendation = async (
    dayId: string,
    location: string,
    date: string,
    lastItem: EnhancedItem,
    fallbackItem: EnhancedItem
  ) => {
    try {
      const day = days.find((d) => d.id === dayId);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-recommend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            location,
            date,
            budget_remaining: budget - totalEstimatedCost,
            existing_activities: day?.items || [],
            destination,
            mode: "single",
            current_location: lastItem.location,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const recs = data.recommendations || [];
      if (recs.length > 0) {
        const rec = recs[0];
        const item: EnhancedItem = {
          id: Date.now().toString(),
          time: rec.time || "",
          activity: rec.activity || "",
          location: rec.location || "",
          status: rec.status || "want",
          description: rec.description || "",
          image_url: rec.photo_url || null,
          rating: rec.rating || null,
          place_id: rec.place_id || null,
          estimated_cost: rec.estimated_cost || 0,
        };
        setDays(days.map((d) => (d.id === dayId ? { ...d, items: [...d.items, item] } : d)));
        toast({ title: `Rekomendasi: ${rec.activity}`, description: rec.description });
        return;
      }
    } catch {
      // Fallback to empty item
    }
    setDays(days.map((d) => (d.id === dayId ? { ...d, items: [...d.items, fallbackItem] } : d)));
  };

  const removeItem = (dayId: string, itemId: string) => {
    setDays(days.map((day) => (day.id === dayId ? { ...day, items: day.items.filter((i) => i.id !== itemId) } : day)));
  };

  const updateItem = (dayId: string, itemId: string, field: keyof EnhancedItem, value: string | number) => {
    setDays(
      days.map((day) =>
        day.id === dayId
          ? { ...day, items: day.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)) }
          : day
      )
    );
  };

  const removeDay = (dayId: string) => {
    setDays(days.filter((d) => d.id !== dayId));
  };

  const handleGeneratedItems = (dayId: string, items: EnhancedItem[]) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, items } : d)));
  };

  const handleDetailSave = (updates: Partial<EnhancedItem>) => {
    if (!selectedItem) return;
    setDays(
      days.map((day) =>
        day.id === selectedItem.dayId
          ? {
              ...day,
              items: day.items.map((item) =>
                item.id === selectedItem.item.id ? { ...item, ...updates } : item
              ),
            }
          : day
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="text-3xl md:text-4xl font-bold font-serif text-foreground bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors w-full"
          />
          <p className="text-muted-foreground text-sm mt-1">Susun rencana perjalananmu di sini</p>
        </div>
        {onSave && (
          <Button onClick={onSave} disabled={saving} className="ml-4 shrink-0">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        )}
      </div>

      {/* Budget */}
      <BudgetInput budget={budget} setBudget={setBudget} totalEstimatedCost={totalEstimatedCost} />

      {/* Days */}
      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <Card key={day.id} className="p-6 border-border/50">
            {/* Day header */}
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Hari {dayIndex + 1}</h3>
              <Input
                type="date"
                value={day.date}
                onChange={(e) => setDays(days.map((d) => (d.id === day.id ? { ...d, date: e.target.value } : d)))}
                className="w-auto ml-auto text-sm h-8"
              />
              <button onClick={() => removeDay(day.id)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Day location - REQUIRED */}
            <div className="flex items-center gap-2 mb-4 bg-muted/20 rounded-lg p-3 border border-border/30">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <Input
                placeholder="Lokasi hari ini (contoh: Kuta, Bali)"
                value={day.location}
                onChange={(e) => setDays(days.map((d) => (d.id === day.id ? { ...d, location: e.target.value } : d)))}
                className="text-sm h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <SmartGeneratePopover
                dayLocation={day.location}
                dayDate={day.date}
                budgetRemaining={budget - totalEstimatedCost}
                existingActivities={day.items}
                destination={destination}
                onGenerated={(items) => handleGeneratedItems(day.id, items)}
              />
            </div>

            {/* Activities */}
            <div className="space-y-2">
              {day.items.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onUpdate={(field, value) => updateItem(day.id, item.id, field, value)}
                  onRemove={() => removeItem(day.id, item.id)}
                  onClick={() => setSelectedItem({ dayId: day.id, item })}
                />
              ))}
            </div>

            <Button variant="ghost" size="sm" className="mt-3" onClick={() => addItem(day.id)}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Aktivitas
            </Button>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={addDay}>
        <Plus className="h-4 w-4 mr-2" /> Tambah Hari
      </Button>

      {/* Detail Dialog */}
      <ActivityDetailDialog
        item={selectedItem?.item || null}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleDetailSave}
      />
    </div>
  );
};

export default ItineraryEditor;
