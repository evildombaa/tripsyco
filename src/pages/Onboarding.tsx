import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import tripsyLogo from "@/assets/tripsy-logo.png";

interface StepConfig {
  question: string;
  field: string;
  otherField?: string;
  options: string[];
  allowOther: boolean;
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
    question: "Aktivitas apa yang paling Anda minati?",
    field: "preferred_activity",
    otherField: "preferred_activity_other",
    options: ["Eksplor kota", "Workshop budaya", "Food hunting", "Aktivitas outdoor"],
    allowOther: true,
  },
  {
    question: "Bagaimana gaya perjalanan Anda?",
    field: "travel_style",
    otherField: "travel_style_other",
    options: ["Santai & mendalam", "Seimbang", "Padat & eksploratif", "Spontan"],
    allowOther: true,
  },
  {
    question: "Seberapa tertarik Anda berinteraksi dengan warga lokal?",
    field: "local_interaction",
    options: ["Sangat tertarik", "Tertarik", "Netral", "Kurang tertarik"],
    allowOther: false,
  },
  {
    question: "Rata-rata budget untuk liburan?",
    field: "budget_preference",
    options: ["Hemat", "Menengah", "Nyaman", "Premium"],
    allowOther: false,
  },
  {
    question: "Dengan siapa Anda bepergian?",
    field: "travel_companion",
    otherField: "travel_companion_other",
    options: ["Solo", "Pasangan", "Teman", "Keluarga"],
    allowOther: true,
  },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});
  const [isOther, setIsOther] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const selectedValue = answers[step.field] || "";
  const isOtherSelected = isOther[step.field] || false;
  const otherValue = otherInputs[step.field] || "";

  const canProceed = isOtherSelected ? otherValue.trim().length > 0 : selectedValue.length > 0;

  const handleSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [step.field]: option }));
    setIsOther((prev) => ({ ...prev, [step.field]: false }));
    // Auto-advance to next step
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        saveOnboardingRef.current();
      }
    }, 300);
  };

  const handleSelectOther = () => {
    setAnswers((prev) => ({ ...prev, [step.field]: "" }));
    setIsOther((prev) => ({ ...prev, [step.field]: true }));
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await saveOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const saveOnboarding = async () => {
    if (!user) return;
    setSaving(true);

    const data: Record<string, string | boolean> = {
      user_id: user.id,
      completed: true,
    };

    for (const s of steps) {
      if (isOther[s.field] && s.otherField) {
        data[s.field] = "Lainnya";
        data[s.otherField] = otherInputs[s.field] || "";
      } else {
        data[s.field] = answers[s.field] || "";
        if (s.otherField) {
          data[s.otherField] = null as any;
        }
      }
    }

    try {
      const { error } = await supabase
        .from("onboarding_responses")
        .upsert(data as any, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Onboarding selesai!", description: "Selamat menikmati Tripsy 🎉" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg p-8 border-border/50">
        <div className="flex flex-col items-center mb-6">
          <img src={tripsyLogo} alt="Tripsy logo" className="h-10 w-10 mb-3" />
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep
                    ? "w-8 bg-primary"
                    : i < currentStep
                    ? "w-2 bg-primary/60"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentStep + 1} dari {totalSteps}
          </p>
        </div>

        <h2 className="text-xl font-bold font-serif text-foreground text-center mb-6">
          {step.question}
        </h2>

        <div className="space-y-3 mb-6">
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
                  maxLength={200}
                  autoFocus
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>

          <Button onClick={handleNext} disabled={!canProceed || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentStep === totalSteps - 1 ? "Selesai" : "Lanjut"}
            {currentStep < totalSteps - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
