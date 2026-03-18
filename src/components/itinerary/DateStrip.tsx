import { useRef, useEffect } from "react";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  departureDate: Date | null;
  totalDays: number;
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  onAddDay: () => void;
}

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const DateStrip = ({ departureDate, totalDays, selectedDayIndex, onSelectDay, onAddDay }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected day
  useEffect(() => {
    if (scrollRef.current) {
      const selected = scrollRef.current.children[selectedDayIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedDayIndex]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Month label */}
      {departureDate && (
        <h2 className="text-2xl font-bold font-serif text-foreground mb-4">
          {format(departureDate, "MMMM yyyy", { locale: localeId })}
        </h2>
      )}

      <div className="flex items-center gap-2">
        {/* Scroll left */}
        <button
          onClick={() => scrollBy(-1)}
          className="shrink-0 h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Day pills */}
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {Array.from({ length: totalDays }).map((_, i) => {
            const date = departureDate ? addDays(departureDate, i) : null;
            const dayName = date ? DAY_NAMES_SHORT[date.getDay()] : `H${i + 1}`;
            const dayNum = date ? date.getDate() : i + 1;
            const today = date ? isToday(date) : false;
            const isSelected = selectedDayIndex === i;

            return (
              <button
                key={i}
                onClick={() => onSelectDay(i)}
                className={`
                  flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded-2xl transition-all duration-200
                  ${isSelected
                    ? "bg-foreground text-background shadow-lg scale-105"
                    : today
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
                      : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <span className={`text-[11px] font-medium ${isSelected ? "text-background/70" : ""}`}>
                  {dayName}
                </span>
                <span className={`text-lg font-bold leading-tight ${today && !isSelected ? "text-primary" : ""}`}>
                  {dayNum}
                </span>
              </button>
            );
          })}

          {/* Add day button */}
          <button
            onClick={onAddDay}
            className="flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll right */}
        <button
          onClick={() => scrollBy(1)}
          className="shrink-0 h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DateStrip;
