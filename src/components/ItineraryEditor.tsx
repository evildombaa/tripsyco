import { useState } from "react";
import { Plus, Calendar, MapPin, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface ItineraryItem {
  id: string;
  time: string;
  activity: string;
  location: string;
}

export interface DayPlan {
  id: string;
  date: string;
  items: ItineraryItem[];
}

interface Props {
  tripName: string;
  setTripName: (v: string) => void;
  days: DayPlan[];
  setDays: (d: DayPlan[]) => void;
  onSave?: () => void;
  saving?: boolean;
}

const ItineraryEditor = ({ tripName, setTripName, days, setDays, onSave, saving }: Props) => {
  const addDay = () => {
    setDays([...days, { id: Date.now().toString(), date: "", items: [] }]);
  };

  const addItem = (dayId: string) => {
    setDays(days.map((day) =>
      day.id === dayId
        ? { ...day, items: [...day.items, { id: Date.now().toString(), time: "", activity: "", location: "" }] }
        : day
    ));
  };

  const removeItem = (dayId: string, itemId: string) => {
    setDays(days.map((day) =>
      day.id === dayId
        ? { ...day, items: day.items.filter((item) => item.id !== itemId) }
        : day
    ));
  };

  const updateItem = (dayId: string, itemId: string, field: keyof ItineraryItem, value: string) => {
    setDays(days.map((day) =>
      day.id === dayId
        ? { ...day, items: day.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }
        : day
    ));
  };

  const removeDay = (dayId: string) => {
    setDays(days.filter((d) => d.id !== dayId));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
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

      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <Card key={day.id} className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Hari {dayIndex + 1}</h3>
              <Input
                type="date"
                value={day.date}
                onChange={(e) => setDays(days.map((d) => d.id === day.id ? { ...d, date: e.target.value } : d))}
                className="w-auto ml-auto text-sm"
              />
              <button onClick={() => removeDay(day.id)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {day.items.map((item) => (
                <div key={item.id} className="group rounded-lg border border-border/50 p-3 hover:bg-accent/30 transition-colors">
                  <div className="hidden sm:flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    <Input type="time" value={item.time} onChange={(e) => updateItem(day.id, item.id, "time", e.target.value)} className="w-28 text-sm" />
                    <Input placeholder="Aktivitas" value={item.activity} onChange={(e) => updateItem(day.id, item.id, "activity", e.target.value)} className="flex-1 text-sm" />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Lokasi" value={item.location} onChange={(e) => updateItem(day.id, item.id, "location", e.target.value)} className="w-32 text-sm" />
                    </div>
                    <button onClick={() => removeItem(day.id, item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex sm:hidden flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <Input type="time" value={item.time} onChange={(e) => updateItem(day.id, item.id, "time", e.target.value)} className="w-28 text-sm" />
                      </div>
                      <button onClick={() => removeItem(day.id, item.id)} className="text-destructive p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input placeholder="Aktivitas" value={item.activity} onChange={(e) => updateItem(day.id, item.id, "activity", e.target.value)} className="text-sm" />
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input placeholder="Lokasi" value={item.location} onChange={(e) => updateItem(day.id, item.id, "location", e.target.value)} className="text-sm" />
                    </div>
                  </div>
                </div>
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
    </div>
  );
};

export default ItineraryEditor;
