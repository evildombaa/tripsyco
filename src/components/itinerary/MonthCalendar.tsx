import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { id as localeId } from "date-fns/locale";

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  datesWithPlans: string[]; // "yyyy-MM-dd"
}

const MonthCalendar = ({ selectedDate, onSelectDate, range, onRangeChange, datesWithPlans }: Props) => {
  const plannedDates = useMemo(
    () =>
      datesWithPlans
        .filter(Boolean)
        .map((s) => {
          const [y, m, d] = s.split("-").map(Number);
          return new Date(y, m - 1, d);
        }),
    [datesWithPlans]
  );

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-3 shadow-sm">
      <Calendar
        mode="range"
        locale={localeId}
        selected={range}
        onSelect={(r) => {
          onRangeChange(r);
          // If user clicks single date with existing plan, also focus that day
          if (r?.from && (!r.to || r.from.getTime() === r.to.getTime())) {
            onSelectDate(r.from);
          } else if (r?.from) {
            onSelectDate(r.from);
          }
        }}
        numberOfMonths={1}
        modifiers={{ planned: plannedDates, focus: [selectedDate] }}
        modifiersClassNames={{
          planned:
            "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
          focus: "ring-2 ring-primary/50",
        }}
        className={cn("p-2 pointer-events-auto mx-auto")}
      />
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Sudah ada itinerary
        </span>
      </div>
    </div>
  );
};

export default MonthCalendar;