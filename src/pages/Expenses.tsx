import { useState } from "react";
import { Plus, Trash2, Wallet, UtensilsCrossed, Car, Hotel, ShoppingBag, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-2">Pengeluaran</h1>
          <p className="text-muted-foreground mb-8">Lacak biaya perjalananmu agar tetap terkontrol.</p>

          <Card className="p-6 mb-6 bg-primary text-primary-foreground border-0">
            <p className="text-sm opacity-80 mb-1">Total Pengeluaran</p>
            <p className="text-3xl font-bold font-mono">{formatCurrency(total)}</p>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {Object.entries(byCategory).map(([cat, amount]) => {
              const Icon = categoryIcons[cat] || Wallet;
              return (
                <Card key={cat} className="p-4 border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{cat}</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{formatCurrency(amount)}</p>
                </Card>
              );
            })}
          </div>

          <Card className="p-4 mb-6 border-border/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Deskripsi"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Jumlah (Rp)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full sm:w-36"
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(categoryIcons).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addExpense}>
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </div>
          </Card>

          <div className="space-y-2">
            {expenses.map((expense) => {
              const Icon = categoryIcons[expense.category] || Wallet;
              return (
                <Card key={expense.id} className="p-4 border-border/50 flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category} · {expense.date}</p>
                  </div>
                  <p className="font-semibold text-foreground text-sm shrink-0">{formatCurrency(expense.amount)}</p>
                  <button
                    onClick={() => removeExpense(expense.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
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
