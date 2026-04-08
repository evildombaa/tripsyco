import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import QuestionnaireStep from "./QuestionnaireStep";
import { Landmark, UtensilsCrossed, Mountain, Bath, Briefcase, Sparkles, User, Heart, Users, Home, Turtle, Scale, Rocket, Dice5, Wallet, CreditCard, Crown, Star } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const PURPOSES = [
  { value: "budaya", label: "Budaya lokal", icon: Landmark },
  { value: "kuliner", label: "Kuliner", icon: UtensilsCrossed },
  { value: "alam", label: "Alam & petualangan", icon: Mountain },
  { value: "relaksasi", label: "Relaksasi", icon: Bath },
  { value: "bisnis", label: "Bisnis", icon: Briefcase },
  { value: "wellness", label: "Wellness", icon: Sparkles },
];

const COMPANIONS = [
  { value: "solo", label: "Solo", icon: User },
  { value: "pasangan", label: "Pasangan", icon: Heart },
  { value: "teman", label: "Teman", icon: Users },
  { value: "keluarga", label: "Keluarga", icon: Home },
];

const STYLES = [
  { value: "santai", label: "Santai & mendalam", icon: Turtle },
  { value: "seimbang", label: "Seimbang", icon: Scale },
  { value: "padat", label: "Padat & eksploratif", icon: Rocket },
  { value: "spontan", label: "Spontan", icon: Dice5 },
];

const BUDGETS = [
  { value: "hemat", label: "Hemat", desc: "Rp 500.000 – Rp 1.000.000", icon: Wallet },
  { value: "menengah", label: "Menengah", desc: "Rp 2.000.000 – Rp 5.000.000", icon: CreditCard },
  { value: "nyaman", label: "Nyaman", desc: "Rp 7.000.000 – Rp 10.000.000", icon: Star },
  { value: "premium", label: "Premium", desc: "Rp 10.000.000 ke atas", icon: Crown },
];

export interface V2Preferences {
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  activeHoursStart: string;
  activeHoursEnd: string;
  travelPurposes: string[];
  travelPurposeCustom: string;
  travelCompanion: string;
  travelCompanionCustom: string;
  travelStyle: string;
  travelStyleCustom: string;
  budgetRange: string;
}

interface Props {
  onComplete: (prefs: V2Preferences) => void;
}

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
  const [style, setStyle] = useState("");
  const [styleCustom, setStyleCustom] = useState("");
  const [budget, setBudget] = useState("");

  const togglePurpose = (v: string) =>
    setPurposes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const canProceed = [
    destination.trim().length > 0,
    !!dateRange?.from && !!dateRange?.to,
    purposes.length > 0 || purposeCustom.trim().length > 0,
    companion.length > 0 || companionCustom.trim().length > 0,
    style.length > 0 || styleCustom.trim().length > 0,
    budget.length > 0,
  ];

  const handleComplete = () => {
    onComplete({
      destination,
      dateStart: dateRange?.from?.toISOString().split("T")[0] || null,
      dateEnd: dateRange?.to?.toISOString().split("T")[0] || null,
      activeHoursStart: activeStart,
      activeHoursEnd: activeEnd,
      travelPurposes: purposes,
      travelPurposeCustom: purposeCustom,
      travelCompanion: companion,
      travelCompanionCustom: companionCustom,
      travelStyle: style,
      travelStyleCustom: styleCustom,
      budgetRange: budget,
    });
  };

  const next = () => {
    if (step === 5) {
      handleComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      {step === 0 && (
        <QuestionnaireStep step={0} totalSteps={6} title="Ke mana tujuan wisata Anda?" onNext={next} onBack={back} canProceed={canProceed[0]} isFirst>
          <Input
            placeholder="Contoh: Bali, Yogyakarta, Raja Ampat..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="text-lg h-14"
            autoFocus
          />
        </QuestionnaireStep>
      )}

      {step === 1 && (
        <QuestionnaireStep step={1} totalSteps={6} title="Pilih tanggal perjalanan Anda" subtitle="Klik tanggal mulai dan tanggal selesai di kalender" onNext={next} onBack={back} canProceed={canProceed[1]}>
          <div className="space-y-6">
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={{ before: new Date() }}
                className="rounded-xl border bg-card p-4 pointer-events-auto"
              />
            </div>
            {dateRange?.from && dateRange?.to && (
              <p className="text-center text-sm text-muted-foreground">
                {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} hari terpilih
              </p>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Jam aktif perjalanan</p>
              <div className="flex items-center gap-3">
                <Select value={activeStart} onValueChange={setActiveStart}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">hingga</span>
                <Select value={activeEnd} onValueChange={setActiveEnd}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {step === 2 && (
        <QuestionnaireStep step={2} totalSteps={6} title="Apa tujuan utama perjalanan Anda?" subtitle="Pilih satu atau lebih" onNext={next} onBack={back} canProceed={canProceed[2]}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {PURPOSES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.value}
                  onClick={() => togglePurpose(p.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    purposes.includes(p.value)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-base font-medium">{p.label}</span>
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Jawaban lain? (opsional)"
            value={purposeCustom}
            onChange={(e) => setPurposeCustom(e.target.value)}
          />
        </QuestionnaireStep>
      )}

      {step === 3 && (
        <QuestionnaireStep step={3} totalSteps={6} title="Dengan siapa Anda bepergian?" onNext={next} onBack={back} canProceed={canProceed[3]}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {COMPANIONS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  onClick={() => setCompanion(c.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    companion === c.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-base font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Jawaban lain? (opsional)"
            value={companionCustom}
            onChange={(e) => { setCompanionCustom(e.target.value); if (e.target.value) setCompanion(""); }}
          />
        </QuestionnaireStep>
      )}

      {step === 4 && (
        <QuestionnaireStep step={4} totalSteps={6} title="Bagaimana gaya perjalanan yang Anda inginkan?" onNext={next} onBack={back} canProceed={canProceed[4]}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {STYLES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    style === s.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-base font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Jawaban lain? (opsional)"
            value={styleCustom}
            onChange={(e) => { setStyleCustom(e.target.value); if (e.target.value) setStyle(""); }}
          />
        </QuestionnaireStep>
      )}

      {step === 5 && (
        <QuestionnaireStep step={5} totalSteps={6} title="Budget yang Anda siapkan?" onNext={next} onBack={back} canProceed={canProceed[5]} isLast>
          <div className="grid grid-cols-1 gap-3">
            {BUDGETS.map((b) => {
              const Icon = b.icon;
              return (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    budget === b.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-foreground" />
                  <div>
                    <span className="text-base font-semibold text-foreground">{b.label}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{b.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </QuestionnaireStep>
      )}
    </div>
  );
};

export default ItineraryV2Questionnaire;
