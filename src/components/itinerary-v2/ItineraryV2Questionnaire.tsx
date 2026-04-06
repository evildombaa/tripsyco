import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, MapPin, Calendar, Target, Users, Compass, Wallet } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { V2Preferences } from "@/pages/ItineraryV2";

interface Props {
  onComplete: (prefs: V2Preferences) => void;
}

const STEPS = [
  { icon: MapPin, title: "Destinasi", subtitle: "Ke mana tujuan wisata Anda?" },
  { icon: Calendar, title: "Tanggal & Waktu", subtitle: "Pilih tanggal dan jam aktif perjalanan Anda" },
  { icon: Target, title: "Tujuan Perjalanan", subtitle: "Apa tujuan utama perjalanan Anda?" },
  { icon: Users, title: "Teman Perjalanan", subtitle: "Dengan siapa Anda bepergian?" },
  { icon: Compass, title: "Gaya Perjalanan", subtitle: "Bagaimana gaya perjalanan yang Anda inginkan?" },
  { icon: Wallet, title: "Budget", subtitle: "Budget yang Anda siapkan?" },
];

const TRAVEL_PURPOSES = ["Budaya lokal", "Kuliner", "Alam & petualangan", "Relaksasi", "Bisnis", "Wellness"];
const TRAVEL_COMPANIONS = ["Solo", "Pasangan", "Teman", "Keluarga"];
const TRAVEL_STYLES = ["Santai & mendalam", "Seimbang", "Padat & eksploratif", "Spontan"];
const BUDGET_OPTIONS = [
  { label: "Hemat", range: "Rp 500.000 - Rp 1.000.000" },
  { label: "Menengah", range: "Rp 2.000.000 - Rp 5.000.000" },
  { label: "Nyaman", range: "Rp 7.000.000 - Rp 10.000.000" },
  { label: "Premium", range: "Rp 10.000.000 ke atas" },
];

const ItineraryV2Questionnaire = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeStart, setActiveStart] = useState("08:00");
  const [activeEnd, setActiveEnd] = useState("21:00");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [purposeCustom, setPurposeCustom] = useState("");
  const [companion, setCompanion] = useState("");
  const [companionCustom, setCompanionCustom] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [styleCustom, setStyleCustom] = useState("");
  const [budgetRange, setBudgetRange] = useState("");

  const canNext = () => {
    switch (step) {
      case 0: return destination.trim().length > 0;
      case 1: return dateRange?.from && dateRange?.to;
      case 2: return purposes.length > 0 || purposeCustom.trim().length > 0;
      case 3: return companion.length > 0 || companionCustom.trim().length > 0;
      case 4: return travelStyle.length > 0 || styleCustom.trim().length > 0;
      case 5: return budgetRange.length > 0;
      default: return false;
    }
  };

  const handleSubmit = () => {
    const allPurposes = [...purposes];
    if (purposeCustom.trim()) allPurposes.push(purposeCustom.trim());

    onComplete({
      destination,
      date_start: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
      date_end: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
      active_hours_start: activeStart,
      active_hours_end: activeEnd,
      travel_purposes: allPurposes,
      travel_purpose_custom: purposeCustom.trim() || undefined,
      travel_companion: companionCustom.trim() || companion,
      travel_companion_custom: companionCustom.trim() || undefined,
      travel_style: styleCustom.trim() || travelStyle,
      travel_style_custom: styleCustom.trim() || undefined,
      budget_range: budgetRange,
    });
  };

  const StepIcon = STEPS[step].icon;
  const totalDays = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-300",
              i <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
          <StepIcon className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{STEPS[step].title}</h2>
        <p className="text-muted-foreground mt-1">{STEPS[step].subtitle}</p>
      </div>

      {/* Step Content */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center">
            <Input
              placeholder="Contoh: Bali, Yogyakarta, Raja Ampat..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="text-lg py-6 text-center"
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 space-y-6">
            <div className="flex justify-center">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                disabled={(date) => date < new Date()}
                locale={localeId}
                className={cn("p-3 pointer-events-auto rounded-xl border border-border")}
              />
            </div>
            {totalDays > 0 && (
              <p className="text-center text-sm text-primary font-medium">
                {totalDays} hari perjalanan ({format(dateRange!.from!, "d MMM", { locale: localeId })} – {format(dateRange!.to!, "d MMM yyyy", { locale: localeId })})
              </p>
            )}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 text-center">Jam Aktif Perjalanan</h4>
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <label className="text-xs text-muted-foreground mb-1">Mulai</label>
                  <Input type="time" value={activeStart} onChange={(e) => setActiveStart(e.target.value)} className="w-32 text-center" />
                </div>
                <span className="text-muted-foreground mt-5">—</span>
                <div className="flex flex-col items-center">
                  <label className="text-xs text-muted-foreground mb-1">Selesai</label>
                  <Input type="time" value={activeEnd} onChange={(e) => setActiveEnd(e.target.value)} className="w-32 text-center" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TRAVEL_PURPOSES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPurposes((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all text-left",
                    purposes.includes(p)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Bisa pilih lebih dari satu</p>
            <Input
              placeholder="Jawaban lain..."
              value={purposeCustom}
              onChange={(e) => setPurposeCustom(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TRAVEL_COMPANIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCompanion(c); setCompanionCustom(""); }}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all",
                    companion === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input
              placeholder="Jawaban lain..."
              value={companionCustom}
              onChange={(e) => { setCompanionCustom(e.target.value); setCompanion(""); }}
            />
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TRAVEL_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setTravelStyle(s); setStyleCustom(""); }}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all",
                    travelStyle === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Input
              placeholder="Jawaban lain..."
              value={styleCustom}
              onChange={(e) => { setStyleCustom(e.target.value); setTravelStyle(""); }}
            />
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 space-y-3">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b.label}
                onClick={() => setBudgetRange(`${b.label} (${b.range})`)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  budgetRange.startsWith(b.label)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="font-semibold text-foreground">{b.label}</span>
                <span className="text-sm text-muted-foreground ml-2">{b.range}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Lanjut <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canNext()} className="gradient-primary border-0">
            Cari Rekomendasi <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ItineraryV2Questionnaire;
