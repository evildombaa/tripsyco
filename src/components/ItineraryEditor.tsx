import { useState, useMemo } from "react";
import { Plus, MapPin, Trash2, CalendarDays, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import BudgetInput from "@/components/itinerary/BudgetInput";
import ActivityCard, { EnhancedItem } from "@/components/itinerary/ActivityCard";
import ActivityDetailDialog from "@/components/itinerary/ActivityDetailDialog";
import SmartGeneratePopover from "@/components/itinerary/SmartGeneratePopover";
import AddActivityDialog from "@/components/itinerary/AddActivityDialog";
import DateStrip from "@/components/itinerary/DateStrip";
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
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<{ dayId: string; item: EnhancedItem } | null>(null);
  const [addDialogDayId, setAddDialogDayId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();

  const totalEstimatedCost = days.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + (item.estimated_cost || 0), 0),
    0
  );

  // Derive departure date from first day
  const departureDate = useMemo(() => {
    if (days.length > 0 && days[0].date) {
      return new Date(days[0].date + "T00:00:00");
    }
    return null;
  }, [days]);

  const setDepartureDate = (date: Date | undefined) => {
    if (!date) return;
    // Update all days' dates based on departure
    const updated = days.map((day, i) => {
      const d = addDays(date, i);
      return { ...day, date: format(d, "yyyy-MM-dd") };
    });
    setDays(updated);
    setCalendarOpen(false);
  };

  const addDay = () => {
    const newDate = departureDate ? format(addDays(departureDate, days.length), "yyyy-MM-dd") : "";
    setDays([...days, { id: Date.now().toString(), date: newDate, location: "", items: [] }]);
    // Select the newly added day
    setTimeout(() => setSelectedDayIndex(days.length), 50);
  };

  const removeDay = (dayId: string) => {
    const idx = days.findIndex(d => d.id === dayId);
    const newDays = days.filter((d) => d.id !== dayId);
    // Recalculate dates for remaining days
    if (departureDate && newDays.length > 0) {
      const updated = newDays.map((day, i) => ({
        ...day,
        date: format(addDays(departureDate, i), "yyyy-MM-dd"),
      }));
      setDays(updated);
    } else {
      setDays(newDays);
    }
    if (selectedDayIndex >= newDays.length) {
      setSelectedDayIndex(Math.max(0, newDays.length - 1));
    }
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

  const handleGeneratedItems = (dayId: string, items: EnhancedItem[]) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, items } : d)));
  };

  const handleAddActivity = (dayId: string, item: EnhancedItem) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, items: [...d.items, item] } : d)));
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

  const onDragEnd = (result: DropResult) => {
    const { source, destination: dest } = result;
    if (!dest) return;
    const newDays = [...days];
    const sourceDay = newDays.find((d) => d.id === source.droppableId);
    const destDay = newDays.find((d) => d.id === dest.droppableId);
    if (!sourceDay || !destDay) return;
    const [movedItem] = sourceDay.items.splice(source.index, 1);
    if (source.droppableId === dest.droppableId) {
      sourceDay.items.splice(dest.index, 0, movedItem);
    } else {
      destDay.items.splice(dest.index, 0, movedItem);
    }
    setDays(newDays);
  };

  // Current selected day
  const currentDay = days[selectedDayIndex];
  const addDialogDay = days.find((d) => d.id === addDialogDayId);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="text-3xl md:text-4xl font-extrabold font-serif text-foreground bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors w-full"
          />
          <p className="text-muted-foreground text-sm mt-1.5">Susun rencana perjalananmu di sini</p>
        </div>
        {onSave && (
          <Button onClick={onSave} disabled={saving} className="ml-4 shrink-0 gradient-primary border-0 shadow-md hover:shadow-lg transition-all">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        )}
      </div>

      {/* Trip setup row: departure date + budget */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Departure date picker */}
        <div className="flex-1">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-12 rounded-xl border-border/50"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {departureDate ? (
                  <span className="text-foreground">
                    Berangkat: <strong>{format(departureDate, "d MMMM yyyy", { locale: localeId })}</strong>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pilih tanggal keberangkatan</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={departureDate || undefined}
                onSelect={setDepartureDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {/* Budget */}
        <div className="flex-1">
          <BudgetInput budget={budget} setBudget={setBudget} totalEstimatedCost={totalEstimatedCost} />
        </div>
      </div>

      {/* Date Strip */}
      <div className="mb-6">
        <DateStrip
          departureDate={departureDate}
          totalDays={days.length}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
          onAddDay={addDay}
        />
      </div>

      {/* Selected day content */}
      {currentDay ? (
        <div className="animate-fade-in">
          {/* Day title + actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                <CalendarDays className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Hari {selectedDayIndex + 1}</h3>
                {currentDay.date && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(currentDay.date + "T00:00:00"), "EEEE, d MMMM yyyy", { locale: localeId })}
                  </p>
                )}
              </div>
            </div>
            {days.length > 1 && (
              <button
                onClick={() => removeDay(currentDay.id)}
                className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Hapus hari ini"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Day location */}
          <div className="flex items-center gap-2 mb-4 bg-muted/40 rounded-xl p-3 border border-border/30">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <Input
              placeholder="Lokasi hari ini (contoh: Kuta, Bali)"
              value={currentDay.location}
              onChange={(e) => setDays(days.map((d) => (d.id === currentDay.id ? { ...d, location: e.target.value } : d)))}
              className="text-sm h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <SmartGeneratePopover
              dayLocation={currentDay.location}
              dayDate={currentDay.date}
              budgetRemaining={budget - totalEstimatedCost}
              existingActivities={currentDay.items}
              destination={destination}
              onGenerated={(items) => handleGeneratedItems(currentDay.id, items)}
            />
          </div>

          {/* Activities */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={currentDay.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[120px] rounded-xl transition-colors p-1 ${
                    snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  {currentDay.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                        <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-foreground mb-1">Belum ada rencana</p>
                      <p className="text-sm text-muted-foreground">
                        Tambahkan aktivitas atau gunakan AI Generate
                      </p>
                    </div>
                  )}
                  {currentDay.items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`${dragSnapshot.isDragging ? "opacity-80 shadow-xl rounded-xl" : ""}`}
                        >
                          <ActivityCard
                            item={item}
                            onUpdate={(field, value) => updateItem(currentDay.id, item.id, field, value)}
                            onRemove={() => removeItem(currentDay.id, item.id)}
                            onClick={() => setSelectedItem({ dayId: currentDay.id, item })}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-muted-foreground hover:text-primary"
            onClick={() => setAddDialogDayId(currentDay.id)}
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah Aktivitas
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-semibold text-foreground mb-1">Belum ada rencana</p>
          <p className="text-sm text-muted-foreground mb-4">Tambahkan hari perjalanan untuk mulai</p>
          <Button variant="outline" onClick={addDay} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Tambah Hari
          </Button>
        </div>
      )}

      {/* Add Activity Dialog */}
      {addDialogDay && (
        <AddActivityDialog
          open={!!addDialogDayId}
          onClose={() => setAddDialogDayId(null)}
          dayLocation={addDialogDay.location}
          dayDate={addDialogDay.date}
          budgetRemaining={budget - totalEstimatedCost}
          existingActivities={addDialogDay.items}
          destination={destination}
          onAdd={(item) => handleAddActivity(addDialogDay.id, item)}
        />
      )}

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
