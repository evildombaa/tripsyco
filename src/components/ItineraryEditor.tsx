import { useState } from "react";
import { Plus, Calendar, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import BudgetInput from "@/components/itinerary/BudgetInput";
import ActivityCard, { EnhancedItem } from "@/components/itinerary/ActivityCard";
import ActivityDetailDialog from "@/components/itinerary/ActivityDetailDialog";
import SmartGeneratePopover from "@/components/itinerary/SmartGeneratePopover";
import AddActivityDialog from "@/components/itinerary/AddActivityDialog";
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
  const [addDialogDayId, setAddDialogDayId] = useState<string | null>(null);
  const { toast } = useToast();

  const totalEstimatedCost = days.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + (item.estimated_cost || 0), 0),
    0
  );

  const addDay = () => {
    setDays([...days, { id: Date.now().toString(), date: "", location: "", items: [] }]);
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

    const sourceDayId = source.droppableId;
    const destDayId = dest.droppableId;

    const newDays = [...days];
    const sourceDay = newDays.find((d) => d.id === sourceDayId);
    const destDay = newDays.find((d) => d.id === destDayId);
    if (!sourceDay || !destDay) return;

    const [movedItem] = sourceDay.items.splice(source.index, 1);

    if (sourceDayId === destDayId) {
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

      {/* Budget */}
      <BudgetInput budget={budget} setBudget={setBudget} totalEstimatedCost={totalEstimatedCost} />

      {/* Days with DnD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-5">
          {days.map((day, dayIndex) => (
            <div key={day.id} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                  <Calendar className="h-4 w-4 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground text-lg">Hari {dayIndex + 1}</h3>
                <Input
                  type="date"
                  value={day.date}
                  onChange={(e) => setDays(days.map((d) => (d.id === day.id ? { ...d, date: e.target.value } : d)))}
                  className="w-auto ml-auto text-sm h-9 rounded-lg"
                />
                <button
                  onClick={() => removeDay(day.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Day location */}
              <div className="flex items-center gap-2 mb-4 bg-muted/40 rounded-xl p-3 border border-border/30">
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

              {/* Droppable Activities */}
              <Droppable droppableId={day.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[40px] rounded-xl transition-colors p-1 ${
                      snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                    }`}
                  >
                    {day.items.map((item, index) => (
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
                              onUpdate={(field, value) => updateItem(day.id, item.id, field, value)}
                              onRemove={() => removeItem(day.id, item.id)}
                              onClick={() => setSelectedItem({ dayId: day.id, item })}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground hover:text-primary" onClick={() => setAddDialogDayId(day.id)}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Aktivitas
              </Button>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Button variant="outline" className="mt-6 w-full rounded-xl h-12 border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary/40" onClick={addDay}>
        <Plus className="h-4 w-4 mr-2" /> Tambah Hari
      </Button>

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
