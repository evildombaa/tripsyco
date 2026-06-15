import { useEffect, useMemo, useRef } from "react";
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
  const DOUBLE_CLICK_DELAY = 400;
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

  const lastClickRef = useRef<{ time: number; date: Date | null }>({ time: 0, date: null });
  const pendingCancelRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingCancel = () => {
    if (pendingCancelRef.current) {
      clearTimeout(pendingCancelRef.current);
      pendingCancelRef.current = null;
    }
  };

  useEffect(() => () => clearPendingCancel(), []);

  const handleDayClick = (date: Date) => {
    const now = Date.now();
    const last = lastClickRef.current;
    const isDouble = last.date && date.toDateString() === last.date.toDateString() && now - last.time < DOUBLE_CLICK_DELAY;
    lastClickRef.current = { time: now, date };

    if (isDouble) {
      clearPendingCancel();
      // Double-click: start a new range (awaiting end date)
      onRangeChange({ from: date, to: undefined });
      onSelectDate(date);
    } else {
      clearPendingCancel();
      // If a range start is pending (double-clicked start, no end yet),
      // delay slightly so a follow-up click that becomes a double-click on the
      // end date is not treated as a single-click that resets the range.
      if (range?.from && !range.to && date.toDateString() !== range.from.toDateString()) {
        pendingCancelRef.current = setTimeout(() => {
          const from = range.from!;
          if (date.getTime() < from.getTime()) {
            onRangeChange({ from: date, to: from });
          } else {
            onRangeChange({ from, to: date });
          }
          onSelectDate(date);
          pendingCancelRef.current = null;
        }, DOUBLE_CLICK_DELAY);
      } else {
        // Single click on a date: select it as a single-day range immediately
        onRangeChange({ from: date, to: date });
        onSelectDate(date);
      }
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-3 shadow-sm">
      <Calendar
        mode="range"
        locale={localeId}
        selected={range}
        onSelect={() => {
          /* range is controlled via double-click in onDayClick */
        }}
        onDayClick={handleDayClick}
        numberOfMonths={1}
        modifiers={{ planned: plannedDates, focus: [selectedDate] }}
        modifiersClassNames={{
          planned:
            "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
          focus: "ring-2 ring-primary/50",
        }}
        className={cn("p-2 pointer-events-auto w-full")}
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-4 w-full",
          table: "w-full border-collapse",
          head_row: "flex w-full",
          head_cell: "text-muted-foreground font-normal text-[0.8rem] flex-1 text-center",
          row: "flex w-full mt-2",
          cell: "flex-1 aspect-square text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center",
        }}
      />
      <div className="flex flex-col items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
        <span className="text-center">
          <span className="font-medium text-foreground">Klik sekali</span> untuk memilih satu tanggal. <span className="font-medium text-foreground">Double klik</span> tanggal awal lalu klik tanggal akhir untuk memilih rentang.
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Sudah ada itinerary
        </span>
      </div>
    </div>
  );
};

export default MonthCalendar;