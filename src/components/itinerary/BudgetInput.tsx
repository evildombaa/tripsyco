import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";

interface Props {
  budget: number;
  setBudget: (v: number) => void;
  totalEstimatedCost?: number;
}

const BudgetInput = ({ budget, setBudget, totalEstimatedCost = 0 }: Props) => {
  const diff = budget - totalEstimatedCost;
  const isOver = diff < 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-bold text-foreground">Budget Perjalanan</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-muted/40 rounded-xl p-2 border border-border/30">
          <span className="text-sm text-primary font-bold px-2">Rp</span>
          <Input
            type="number"
            value={budget || ""}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="Masukkan budget perjalanan..."
            className="text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {budget > 0 && (
          <div className="text-xs space-y-1 sm:text-right min-w-[180px]">
            <p className="text-muted-foreground">
              Estimasi: <span className="font-bold text-foreground">Rp {totalEstimatedCost.toLocaleString("id-ID")}</span>
            </p>
            <p className={`font-bold ${isOver ? "text-destructive" : "text-primary"}`}>
              {isOver
                ? `Kelebihan: Rp ${Math.abs(diff).toLocaleString("id-ID")}`
                : `Sisa: Rp ${diff.toLocaleString("id-ID")}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetInput;
