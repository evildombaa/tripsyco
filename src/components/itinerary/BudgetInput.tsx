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
    <div className="bg-card border border-border/50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Budget Perjalanan</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground font-medium">Rp</span>
          <Input
            type="number"
            value={budget || ""}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="Masukkan budget perjalanan..."
            className="text-sm"
          />
        </div>
        {budget > 0 && (
          <div className="text-xs space-y-0.5 sm:text-right min-w-[180px]">
            <p className="text-muted-foreground">
              Estimasi pengeluaran: <span className="font-medium text-foreground">Rp {totalEstimatedCost.toLocaleString("id-ID")}</span>
            </p>
            <p className={isOver ? "text-destructive font-medium" : "text-primary font-medium"}>
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
