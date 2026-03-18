import { useRef, useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  datesWithPlans: string[]; // yyyy-MM-dd strings that have plans
  onAddDay: () => void;
}

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const DateStrip = ({ selectedDate, onSelectDate, datesWithPlans, onAddDay }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(selectedDate));
  const todayRef = useRef<HTMLButtonElement>(null);

  const monthDates = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Scroll to today or selected date on mount / month change
  useEffect(() => {
    if (!scrollRef.current) return;
    const targetDate = monthDates.find((d) => isSameDay(d, selectedDate)) || monthDates.find((d) => isToday(d));
    if (targetDate) {
      const idx = monthDates.findIndex((d) => isSameDay(d, targetDate));
      const el = scrollRef.current.children[idx] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div>
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-2xl font-bold font-serif text-foreground">
          {format(currentMonth, "MMMM yyyy", { locale: localeId })}
        </h2>
        <button
          onClick={nextMonth}
          className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Date strip */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => scrollBy(-1)}
          className="shrink-0 h-8 w-8 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto flex-1 py-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {monthDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayName = DAY_NAMES_SHORT[date.getDay()];
            const dayNum = date.getDate();
            const today = isToday(date);
            const isSelected = isSameDay(date, selectedDate);
            const hasPlan = datesWithPlans.includes(dateStr);

            return (
              <button
                key={dateStr}
                ref={today ? todayRef : undefined}
                onClick={() => onSelectDate(date)}
                className={`
                  relative flex flex-col items-center justify-center shrink-0 w-[3.25rem] h-[4rem] rounded-2xl transition-all duration-200
                  ${isSelected
                    ? "bg-foreground text-background shadow-lg scale-[1.08]"
                    : today
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
                      : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <span className={`text-[10px] font-medium leading-none mb-0.5 ${isSelected ? "text-background/60" : ""}`}>
                  {dayName}
                </span>
                <span className={`text-base font-bold leading-none ${today && !isSelected ? "text-primary" : ""}`}>
                  {dayNum}
                </span>
                {/* Dot indicator for dates with plans */}
                {hasPlan && !isSelected && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />
                )}
                {hasPlan && isSelected && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-background/60" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollBy(1)}
          className="shrink-0 h-8 w-8 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scroll indicator bar */}
      <div className="flex items-center gap-1 mt-2 px-10">
        <div className="h-1 bg-muted rounded-full flex-1 overflow-hidden">
          <div
            className="h-full bg-foreground/20 rounded-full transition-all"
            style={{
              width: `${Math.max(20, (7 / monthDates.length) * 100)}%`,
              marginLeft: `${((selectedDate.getDate() - 1) / monthDates.length) * 80}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DateStrip;
