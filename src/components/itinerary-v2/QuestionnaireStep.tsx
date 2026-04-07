import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QuestionnaireStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  lastLabel?: string;
}

const QuestionnaireStep = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  canProceed,
  isFirst,
  isLast,
  lastLabel = "Lihat Rekomendasi",
}: QuestionnaireStepProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-1">Langkah {step + 1} dari {totalSteps}</p>
      <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
      {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}

      <div className="min-h-[300px]">{children}</div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} disabled={isFirst}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gradient-primary border-0">
          {isLast ? lastLabel : "Lanjut"} {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default QuestionnaireStep;
