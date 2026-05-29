import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import char1 from "@/assets/characters/char-1.png";
import char2 from "@/assets/characters/char-2.png";
import char3 from "@/assets/characters/char-3.png";
import char4 from "@/assets/characters/char-4.png";
import char5 from "@/assets/characters/char-5.png";

export interface QuestionnaireAnswers {
  destination: string;
  daily_hours_start: string;
  daily_hours_end: string;
  travel_purposes: string[];
  travel_purpose_other?: string;
  travel_companion: string;
  travel_companion_other?: string;
  travel_style: string;
  travel_style_other?: string;
  budget_tier: string;
  budget: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (answers: QuestionnaireAnswers) => void;
  numDays: number;
}

const characters = [char1, char2, char3, char4, char5];

// Preload all character images once so swaps appear instantly (no progressive load).
if (typeof window !== "undefined") {
  characters.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

const HOURS_PRESETS = [
  { label: "06.30 - 22.00", start: "06:30", end: "22:00" },
  { label: "08.00 - 21.00", start: "08:00", end: "21:00" },
  { label: "10.00 - 23.00", start: "10:00", end: "23:00" },
];

const PURPOSES = ["Budaya lokal", "Kuliner", "Alam & petualangan", "Relaksasi", "Bisnis", "Wellness"];
const COMPANIONS = ["Solo", "Pasangan", "Teman", "Keluarga"];
const STYLES = ["Santai & mendalam", "Seimbang", "Padat & eksploratif", "Spontan"];
const BUDGETS = [
  { tier: "Hemat", range: "Rp 500.000 - Rp 1.000.000", mid: 750000 },
  { tier: "Menengah", range: "Rp 2.000.000 - Rp 5.000.000", mid: 3500000 },
  { tier: "Nyaman", range: "Rp 7.000.000 - Rp 10.000.000", mid: 8500000 },
  { tier: "Premium", range: "Rp 10.000.000 ke atas", mid: 15000000 },
];

// Generate time options every 30 min
const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  return out;
})();

const QuestionnaireGame = ({ open, onClose, onComplete, numDays }: Props) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"in" | "out-right">("in");

  // Answers
  const [destination, setDestination] = useState("");
  const [hoursPreset, setHoursPreset] = useState<string>("");
  const [customStart, setCustomStart] = useState("08:00");
  const [customEnd, setCustomEnd] = useState("21:00");

  const [purposes, setPurposes] = useState<string[]>([]);
  const [purposeOther, setPurposeOther] = useState("");
  const [showPurposeOther, setShowPurposeOther] = useState(false);

  const [companion, setCompanion] = useState("");
  const [companionOther, setCompanionOther] = useState("");
  const [style, setStyle] = useState("");
  const [styleOther, setStyleOther] = useState("");
  const [budgetTier, setBudgetTier] = useState("");

  useEffect(() => {
    if (open) {
      setStep(0);
      setDirection("in");
    }
  }, [open]);

  if (!open) return null;

  const totalSteps = 5;

  const goNext = () => {
    setDirection("out-right");
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
      setDirection("in");
    }, 280);
  };

  const goBack = () => {
    if (step === 0) {
      onClose();
      return;
    }
    setDirection("out-right");
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setDirection("in");
    }, 280);
  };

  const finish = () => {
    const hours = hoursPreset === "custom"
      ? { start: customStart, end: customEnd }
      : HOURS_PRESETS.find((p) => p.label === hoursPreset) || HOURS_PRESETS[1];

    const allPurposes = showPurposeOther && purposeOther.trim()
      ? [...purposes, purposeOther.trim()]
      : purposes;

    const budgetInfo = BUDGETS.find((b) => b.tier === budgetTier) || BUDGETS[1];

    onComplete({
      destination: destination.trim(),
      daily_hours_start: hours.start,
      daily_hours_end: hours.end,
      travel_purposes: allPurposes,
      travel_companion: companion === "Lainnya" ? companionOther.trim() : companion,
      travel_companion_other: companion === "Lainnya" ? companionOther.trim() : undefined,
      travel_style: style === "Lainnya" ? styleOther.trim() : style,
      travel_style_other: style === "Lainnya" ? styleOther.trim() : undefined,
      budget_tier: `${budgetInfo.tier} (${budgetInfo.range})`,
      budget: budgetInfo.mid,
    });
  };

  // Validation per step
  const canProceed = (() => {
    if (step === 0) {
      const okHours = hoursPreset && (hoursPreset !== "custom" || (customStart && customEnd && customStart < customEnd));
      return destination.trim().length > 0 && okHours;
    }
    if (step === 1) return purposes.length > 0 || (showPurposeOther && purposeOther.trim().length > 0);
    if (step === 2) return companion && (companion !== "Lainnya" || companionOther.trim().length > 0);
    if (step === 3) return style && (style !== "Lainnya" || styleOther.trim().length > 0);
    if (step === 4) return !!budgetTier;
    return false;
  })();

  const handleNext = () => {
    if (!canProceed) return;
    if (step === totalSteps - 1) finish();
    else goNext();
  };

  const togglePurpose = (p: string) => {
    setPurposes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-card/90 border border-border/40 flex items-center justify-center hover:bg-card transition-colors"
        aria-label="Tutup"
      >
        <X className="h-5 w-5 text-foreground" />
      </button>

      {/* Character */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[42%] sm:bottom-[38%] pointer-events-none overflow-hidden">
        <img
          key={step}
          src={characters[step]}
          alt="Karakter"
          decoding="sync"
          loading="eager"
          className={cn(
            "h-[55vh] sm:h-[65vh] max-h-[520px] w-auto object-contain drop-shadow-2xl",
            direction === "in" && "animate-[charSlideIn_0.35s_cubic-bezier(0.22,1,0.36,1)_both]",
            direction === "out-right" && "animate-[charSlideOut_0.28s_ease-in_both]"
          )}
        />
      </div>

      {/* Hover box */}
      <div className="relative w-full max-w-2xl mx-auto z-20">
        <div className="bg-card border border-border/40 rounded-t-3xl shadow-2xl p-6 sm:p-8 max-h-[55vh] overflow-auto">
          {/* Progress */}
          <div className="flex items-center gap-1.5 mb-5 justify-center">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-8 gradient-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-border"
                )}
              />
            ))}
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  1. Ke mana tujuan wisata anda?
                </label>
                <Input
                  placeholder="Contoh: Bali, Yogyakarta..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  autoFocus
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  1b. Berapa lama perkiraan durasi jam aktif harian anda?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {HOURS_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setHoursPreset(p.label)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                        hoursPreset === p.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setHoursPreset("custom")}
                  className={cn(
                    "mt-2 w-full px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                    hoursPreset === "custom"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  Lainnya
                </button>
                {hoursPreset === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Akan dibuat itinerary untuk {numDays} hari.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-base font-bold font-serif text-foreground mb-1">
                Apa tujuan utama perjalanan Anda?
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Bisa pilih lebih dari satu</p>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePurpose(p)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left",
                      purposes.includes(p)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPurposeOther((v) => !v)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                  showPurposeOther
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                Jawaban lain
              </button>
              {showPurposeOther && (
                <Input
                  placeholder="Tulis jawaban Anda..."
                  value={purposeOther}
                  onChange={(e) => setPurposeOther(e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={120}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <SingleChoice
              title="Dengan siapa Anda bepergian?"
              options={COMPANIONS}
              value={companion}
              onChange={setCompanion}
              otherValue={companionOther}
              onOtherChange={setCompanionOther}
            />
          )}

          {step === 3 && (
            <SingleChoice
              title="Bagaimana gaya perjalanan yang Anda inginkan?"
              options={STYLES}
              value={style}
              onChange={setStyle}
              otherValue={styleOther}
              onOtherChange={setStyleOther}
            />
          )}

          {step === 4 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-base font-bold font-serif text-foreground mb-2">
                Budget yang anda siapkan?
              </h3>
              <div className="space-y-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b.tier}
                    onClick={() => setBudgetTier(b.tier)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-left transition-all",
                      budgetTier === b.tier
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-semibold text-sm text-foreground">{b.tier}</div>
                    <div className="text-xs text-muted-foreground">{b.range}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <Button variant="ghost" onClick={goBack} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> {step === 0 ? "Tutup" : "Kembali"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gradient-primary border-0 shadow-sm"
            >
              {step === totalSteps - 1 ? "Generate Itinerary" : "Lanjut"}
              {step < totalSteps - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes charSlideIn {
          from { transform: translateX(80vw); }
          to { transform: translateX(0); }
        }
        @keyframes charSlideOut {
          from { transform: translateX(0); }
          to { transform: translateX(-80vw); }
        }
      `}</style>
    </div>
  );
};

interface SingleChoiceProps {
  title: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  otherValue: string;
  onOtherChange: (v: string) => void;
}

const SingleChoice = ({ title, options, value, onChange, otherValue, onOtherChange }: SingleChoiceProps) => (
  <div className="space-y-3 animate-fade-in">
    <h3 className="text-base font-bold font-serif text-foreground mb-2">{title}</h3>
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left",
            value === o
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary/40"
          )}
        >
          {o}
        </button>
      ))}
    </div>
    <button
      onClick={() => onChange("Lainnya")}
      className={cn(
        "w-full px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
        value === "Lainnya"
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary/40"
      )}
    >
      Jawaban lain
    </button>
    {value === "Lainnya" && (
      <Input
        placeholder="Tulis jawaban Anda..."
        value={otherValue}
        onChange={(e) => onOtherChange(e.target.value)}
        className="h-11 rounded-xl"
        maxLength={120}
      />
    )}
  </div>
);

export default QuestionnaireGame;