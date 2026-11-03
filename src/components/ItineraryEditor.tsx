import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ActivityCard, { EnhancedItem } from "@/components/itinerary/ActivityCard";
import ActivityDetailDialog from "@/components/itinerary/ActivityDetailDialog";
import AddActivityDialog from "@/components/itinerary/AddActivityDialog";
import MonthCalendar from "@/components/itinerary/MonthCalendar";
import { DateRange } from "react-day-picker";
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
  onDelete?: () => void;
  deleting?: boolean;
  onDeleteDay?: (dayId: string, date: string) => Promise<void> | void;
  range?: DateRange;
  onRangeChange?: (r: DateRange | undefined) => void;
  onGenerate?: () => void;
  generating?: boolean;
  selectedDate?: Date;
  onSelectedDateChange?: (date: Date) => void;
}

const ItineraryEditor = ({ tripName, setTripName, days, setDays, budget, setBudget, destination, onSave, saving, onDelete, deleting, onDeleteDay, range, onRangeChange, onGenerate, generating, selectedDate: controlledSelectedDate, onSelectedDateChange }: Props) => {
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(() => controlledSelectedDate ?? new Date());
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const setSelectedDate = (date: Date) => {
    if (!controlledSelectedDate) {
      setInternalSelectedDate(date);
    }
    onSelectedDateChange?.(date);
  };

  const [selectedItem, setSelectedItem] = useState<{ dayId: string; item: EnhancedItem } | null>(null);
  const [addDialogDayId, setAddDialogDayId] = useState<string | null>(null);
  const { toast } = useToast();
  const didInitDate = useRef(false);

  // Auto-jump to the first saved day's date on initial load so saved data is visible
  useEffect(() => {
    if (didInitDate.current) return;
    const firstWithDate = days.find((d) => d.date);
    if (firstWithDate) {
      const [y, m, dd] = firstWithDate.date.split("-").map(Number);
      setSelectedDate(new Date(y, m - 1, dd));
      didInitDate.current = true;
    }
  }, [days]);

  const totalEstimatedCost = days.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + (item.estimated_cost || 0), 0),
    0
  );

  // Dates that have plans (for dot indicators)
  const datesWithPlans = useMemo(() => days.filter((d) => d.date).map((d) => d.date), [days]);

  // Find or create the day plan for selected date
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const currentDay = days.find((d) => d.date === selectedDateStr);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    // Don't auto-create — only navigate. Days are created via generate or manual button.
  };

  const addDay = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    if (!days.find((d) => d.date === dateStr)) {
      setDays([...days, { id: Date.now().toString(), date: dateStr, location: "", items: [] }]);
    }
  };

  const handleAddActivityClick = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    let day = days.find((d) => d.date === dateStr);
    if (!day) {
      const newDay: DayPlan = { id: Date.now().toString(), date: dateStr, location: "", items: [] };
      setDays([...days, newDay]);
      day = newDay;
    }
    setAddDialogDayId(day.id);
  };

  const removeDay = (dayId: string) => {
    setDays(days.filter((d) => d.id !== dayId));
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

  const addDialogDay = days.find((d) => d.id === addDialogDayId);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 min-w-0">
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="text-2xl md:text-3xl font-extrabold font-serif text-foreground bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors w-full truncate"
          />
        </div>
      </div>

      {/* Month Calendar */}
      {onRangeChange && (
        <div className="mb-4">
          <MonthCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            range={range}
            onRangeChange={onRangeChange}
            datesWithPlans={datesWithPlans}
          />
        </div>
      )}

      {/* Generate button — visible when range with 2+ days is selected */}
      {onGenerate && range?.from && range?.to && (
        <div className="mb-6">
          <Button
            onClick={onGenerate}
            disabled={generating}
            className="w-full gradient-primary border-0 shadow-md h-12 text-base font-semibold"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {generating ? "Membuat itinerary..." : "Generate Itinerary untuk rentang ini"}
          </Button>
        </div>
      )}
      {onGenerate && range?.from && !range?.to && (
        <div className="mb-6">
          <Button
            onClick={onGenerate}
            disabled={generating}
            variant="outline"
            className="w-full h-12 text-base font-semibold"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {generating ? "Membuat itinerary..." : "Generate untuk 1 hari ini"}
          </Button>
        </div>
      )}

      {/* Section title */}
      <div className="mb-4">
        <h3 className="text-xl font-bold font-serif text-foreground">Rencana Hari Ini</h3>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "EEEE, d MMMM yyyy", { locale: localeId })}
        </p>
      </div>

      {/* Selected day content */}
      {currentDay ? (
        <div className="animate-fade-in">
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
                        <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
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

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-primary hover:border-primary/40"
              onClick={() => setAddDialogDayId(currentDay.id)}
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Aktivitas
            </Button>
            {onSave && (
              <div className="ml-auto flex items-center gap-2">
                {onDeleteDay && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!confirm(`Hapus rencana untuk tanggal ${format(selectedDate, "d MMMM yyyy", { locale: localeId })}?`)) return;
                      onDeleteDay(currentDay.id, currentDay.date);
                    }}
                    disabled={deleting || saving}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deleting ? "Menghapus..." : "Hapus"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={saving}
                  className="gradient-primary border-0 shadow-md hover:shadow-lg transition-all"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground mb-1">Belum ada rencana</p>
          <p className="text-sm text-muted-foreground mb-4">
            Pilih rentang tanggal di kalender lalu generate, atau tambahkan rencana manual
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              onClick={handleAddActivityClick}
              className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Aktivitas
            </Button>
            {onSave && (
              <Button
                onClick={onSave}
                disabled={saving}
                className="rounded-xl gradient-primary border-0 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            )}
          </div>
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
