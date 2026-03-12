import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, ArrowLeft, CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import tripsyLogo from "@/assets/tripsy-logo.png";

interface StepConfig {
  question: string;
  field: string;
  otherField?: string;
  options: string[];
  allowOther: boolean;
  isNumeric?: boolean;
  isDate?: boolean;
  placeholder?: string;
  prefix?: string;
}

const steps: StepConfig[] = [
  {
    question: "Apa tujuan utama perjalanan Anda?",
    field: "travel_purpose",
    otherField: "travel_purpose_other",
    options: ["Budaya lokal", "Kuliner", "Alam & petualangan", "Relaksasi"],
    allowOther: true,
  },
  {
    question: "Dengan siapa Anda bepergian?",
    field: "travel_companion",
    otherField: "travel_companion_other",
    options: ["Solo", "Pasangan", "Teman", "Keluarga"],
    allowOther: true,
  },
  {
    question: "Bagaimana gaya perjalanan yang Anda inginkan?",
    field: "travel_style",
    otherField: "travel_style_other",
    options: ["Santai & mendalam", "Seimbang", "Padat & eksploratif", "Spontan"],
    allowOther: true,
  },
  {
    question: "Berapa budget perjalanan Anda?",
    field: "budget",
    options: [],
    allowOther: false,
    isNumeric: true,
    placeholder: "Contoh: 5000000 (dalam Rupiah)",
    prefix: "Rp",
  },
  {
    question: "Berapa lama perjalanan Anda?",
    field: "duration",
    otherField: "duration_other",
    options: ["1 hari", "2–3 hari", "4–5 hari", "1 minggu"],
    allowOther: true,
  },
  {
    question: "Kapan tanggal keberangkatan Anda?",
    field: "departure_date",
    options: [],
    allowOther: false,
    isDate: true,
  },
];

export interface ItineraryPreferences {
  destination: string;
  travel_purpose: string;
  travel_purpose_other?: string;
  travel_companion: string;
  travel_companion_other?: string;
  travel_style: string;
  travel_style_other?: string;
  budget: number;
  duration: string;
  duration_other?: string;
  departure_date: string;
}

interface Props {
  onComplete: (preferences: ItineraryPreferences) => void;
  onBack: () => void;
}

const ItineraryQuestionnaire = ({ onComplete, onBack }: Props) => {
  const [destination, setDestination] = useState("");
  const [showDestination, setShowDestination] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});
  const [isOther, setIsOther] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const completeRef = useRef<() => void>(() => {});

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const selectedValue = answers[step.field] || "";
  const isOtherSelected = isOther[step.field] || false;
  const otherValue = otherInputs[step.field] || "";
  const canProceed = step.isNumeric
    ? Number(answers[step.field]) > 0
    : step.isDate
      ? !!selectedDate
      : isOtherSelected
        ? otherValue.trim().length > 0
        : selectedValue.length > 0;

  const buildPreferences = useCallback((): ItineraryPreferences => {
    const prefs: any = { destination };
    for (const s of steps) {
      if (s.isDate) {
        prefs[s.field] = answers[s.field] || "";
      } else if (isOther[s.field] && s.otherField) {
        prefs[s.field] = "Lainnya";
        prefs[s.otherField] = otherInputs[s.field] || "";
      } else {
        prefs[s.field] = s.isNumeric ? Number(answers[s.field]) || 0 : answers[s.field] || "";
        if (s.otherField) prefs[s.otherField] = null;
      }
    }
    return prefs;
  }, [destination, answers, isOther, otherInputs]);

  const handleComplete = useCallback(() => {
    onComplete(buildPreferences());
  }, [buildPreferences, onComplete]);

  useEffect(() => {
    completeRef.current = handleComplete;
  }, [handleComplete]);

  const handleSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [step.field]: option }));
    setIsOther((prev) => ({ ...prev, [step.field]: false }));
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        completeRef.current();
      }
    }, 300);
  };

  const handleSelectOther = () => {
    setAnswers((prev) => ({ ...prev, [step.field]: "" }));
    setIsOther((prev) => ({ ...prev, [step.field]: true }));
  };

  const handleNext = () => {
    if (showDestination) {
      if (destination.trim()) setShowDestination(false);
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (showDestination) {
      onBack();
      return;
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      setShowDestination(true);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      setAnswers((prev) => ({ ...prev, [step.field]: dateStr }));
    }
  };

  // Destination step
  if (showDestination) {
    return (
      <Card className="w-full max-w-lg mx-auto p-8 border-border/50">
        <div className="flex flex-col items-center mb-6">
          <img src={tripsyLogo} alt="Tripsy" className="h-10 w-10 mb-3" />
          <p className="text-xs text-muted-foreground">Langkah 1 dari {totalSteps + 1}</p>
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground text-center mb-6">
          Mau pergi ke mana?
        </h2>
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <Input
            placeholder="Contoh: Bali, Yogyakarta, Raja Ampat..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && destination.trim()) handleNext();
            }}
            autoFocus
          />
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>
          <Button onClick={handleNext} disabled={!destination.trim()}>
            Lanjut <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto p-8 border-border/50">
      <div className="flex flex-col items-center mb-6">
        <img src={tripsyLogo} alt="Tripsy" className="h-10 w-10 mb-3" />
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalSteps + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentStep + 1
                  ? "w-8 bg-primary"
                  : i < currentStep + 1
                  ? "w-2 bg-primary/60"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {currentStep + 2} dari {totalSteps + 1}
        </p>
      </div>

      <h2 className="text-xl font-bold font-serif text-foreground text-center mb-6">
        {step.question}
      </h2>

      <div className="space-y-3 mb-6">
        {step.isDate ? (
          <div className="flex flex-col items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12 text-base",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {selectedDate
                    ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: idLocale })
                    : "Pilih tanggal keberangkatan"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                📅 Keberangkatan: {format(selectedDate, "dd MMMM yyyy", { locale: idLocale })}
              </p>
            )}
          </div>
        ) : step.isNumeric ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-foreground shrink-0">{step.prefix}</span>
            <Input
              type="number"
              placeholder={step.placeholder}
              value={answers[step.field] || ""}
              onChange={(e) => {
                const value = e.target.value;
                setAnswers((prev) => ({ ...prev, [step.field]: value }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answers[step.field]?.trim()) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              autoFocus
              className="text-lg"
            />
          </div>
        ) : (
          <>
            {step.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedValue === option && !isOtherSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {option}
              </button>
            ))}

            {step.allowOther && (
              <div>
                <button
                  onClick={handleSelectOther}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    isOtherSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  Lainnya
                </button>
                {isOtherSelected && (
                  <Input
                    className="mt-2"
                    placeholder="Tulis jawaban Anda..."
                    value={otherValue}
                    onChange={(e) =>
                      setOtherInputs((prev) => ({ ...prev, [step.field]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otherValue.trim()) {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    maxLength={200}
                    autoFocus
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        {(isOtherSelected || step.isNumeric || step.isDate) && (
          <Button onClick={handleNext} disabled={!canProceed}>
            {currentStep === totalSteps - 1 ? "Buat Itinerary" : "Lanjut"}
            {currentStep < totalSteps - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ItineraryQuestionnaire;
