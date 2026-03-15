import { useState } from "react";
import { Plus, Trash2, Wallet, UtensilsCrossed, Car, Hotel, ShoppingBag, Ticket, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  Makanan: UtensilsCrossed,
  Transportasi: Car,
  Penginapan: Hotel,
  Belanja: ShoppingBag,
  Tiket: Ticket,
  Lainnya: Wallet,
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "1", description: "Nasi goreng di warung", amount: 25000, category: "Makanan", date: "2026-03-15" },
    { id: "2", description: "Grab ke Tegallalang", amount: 45000, category: "Transportasi", date: "2026-03-15" },
    { id: "3", description: "Tiket masuk Monkey Forest", amount: 80000, category: "Tiket", date: "2026-03-15" },
    { id: "4", description: "Hotel malam pertama", amount: 450000, category: "Penginapan", date: "2026-03-15" },
  ]);

  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Makanan");

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const addExpense = () => {
    if (!newDesc || !newAmount) return;
    setExpenses([...expenses, {
      id: Date.now().toString(),
      description: newDesc,
      amount: parseInt(newAmount),
      category: newCategory,
      date: new Date().toISOString().split("T")[0],
    }]);
    setNewDesc("");
    setNewAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-10">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Tracking</p>
            <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground mb-2">Pengeluaran</h1>
            <p className="text-muted-foreground">Lacak biaya perjalananmu agar tetap terkontrol.</p>
          </div>

          {/* Total Card */}
          <div className="rounded-2xl gradient-primary p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70 font-medium mb-1">Total Pengeluaran</p>
                <p className="text-3xl md:text-4xl font-bold font-mono text-primary-foreground">{formatCurrency(total)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {Object.entries(byCategory).map(([cat, amount]) => {
              const Icon = categoryIcons[cat] || Wallet;
              return (
                <div key={cat} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">{cat}</span>
                  </div>
                  <p className="font-bold text-foreground">{formatCurrency(amount)}</p>
                </div>
              );
            })}
          </div>

          {/* Add expense form */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-8 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-3">Tambah Pengeluaran</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Deskripsi"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 h-11"
              />
              <Input
                type="number"
                placeholder="Jumlah (Rp)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full sm:w-36 h-11"
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-full sm:w-36 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(categoryIcons).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addExpense} className="h-11 gradient-primary border-0 shadow-sm">
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </div>
          </div>

          {/* Expense list */}
          <div className="space-y-2">
            {expenses.map((expense) => {
              const Icon = categoryIcons[expense.category] || Wallet;
              return (
                <div
                  key={expense.id}
                  className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4 group hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{expense.category} · {expense.date}</p>
                  </div>
                  <p className="font-bold text-foreground text-sm shrink-0">{formatCurrency(expense.amount)}</p>
                  <button
                    onClick={() => removeExpense(expense.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1.5 rounded-lg hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Expenses;
