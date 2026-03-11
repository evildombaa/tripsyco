import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { DayPlan } from "@/components/ItineraryEditor";
import type { EnhancedItem } from "@/components/itinerary/ActivityCard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatAction {
  action: string;
  day_index?: number;
  changes?: any;
}

interface Props {
  itineraryContext: any;
  days: DayPlan[];
  setDays: (d: DayPlan[]) => void;
  budget: number;
  setBudget: (v: number) => void;
}

const ItineraryChatbot = ({ itineraryContext, days, setDays, budget, setBudget }: Props) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Halo! 👋 Saya Tripsy Assistant. Saya bisa langsung mengubah itinerary kamu. Contoh:\n\n• \"Ganti aktivitas hari 1 dengan yang lebih murah\"\n• \"Tambah wisata pantai di hari 2\"\n• \"Sesuaikan jadwal agar tidak melebihi budget\"\n• \"Hapus aktivitas ke-3 di hari 1\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const applyAction = (action: ChatAction) => {
    const newDays = [...days];

    switch (action.action) {
      case "replace_activity": {
        const di = action.day_index ?? 0;
        if (di < newDays.length && action.changes?.activity_index !== undefined) {
          const ai = action.changes.activity_index;
          if (ai < newDays[di].items.length) {
            newDays[di].items[ai] = {
              ...newDays[di].items[ai],
              ...mapChangesToItem(action.changes.new_activity),
            };
          }
        }
        break;
      }
      case "add_activity": {
        const di = action.day_index ?? 0;
        if (di < newDays.length && action.changes?.new_activity) {
          newDays[di].items.push(createItem(action.changes.new_activity));
        }
        break;
      }
      case "remove_activity": {
        const di = action.day_index ?? 0;
        if (di < newDays.length && action.changes?.activity_index !== undefined) {
          newDays[di].items.splice(action.changes.activity_index, 1);
        }
        break;
      }
      case "regenerate_day": {
        const di = action.day_index ?? 0;
        if (di < newDays.length && action.changes?.activities) {
          newDays[di].items = action.changes.activities.map((a: any) => createItem(a));
        }
        break;
      }
      case "modify_day": {
        const di = action.day_index ?? 0;
        if (di < newDays.length && action.changes?.activities) {
          newDays[di].items = action.changes.activities.map((a: any) => createItem(a));
        }
        if (action.changes?.location && di < newDays.length) {
          newDays[di].location = action.changes.location;
        }
        break;
      }
      case "adjust_budget": {
        if (action.changes?.new_budget) {
          setBudget(action.changes.new_budget);
        }
        // Also update activities if provided
        if (action.changes?.day_updates) {
          for (const update of action.changes.day_updates) {
            const di = update.day_index ?? 0;
            if (di < newDays.length && update.activities) {
              newDays[di].items = update.activities.map((a: any) => createItem(a));
            }
          }
        }
        break;
      }
      default:
        return false;
    }

    setDays(newDays);
    return true;
  };

  const mapChangesToItem = (data: any): Partial<EnhancedItem> => ({
    time: data.time || "",
    activity: data.activity || "",
    location: data.location || "",
    status: data.status || "want",
    description: data.description || "",
    estimated_cost: data.estimated_cost || 0,
    rating: data.rating || null,
    image_url: data.photo_url || data.image_url || null,
    place_id: data.place_id || null,
  });

  const createItem = (data: any): EnhancedItem => ({
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: data.time || "",
    activity: data.activity || "",
    location: data.location || "",
    status: data.status || "want",
    description: data.description || "",
    image_url: data.photo_url || data.image_url || null,
    rating: data.rating || null,
    place_id: data.place_id || null,
    estimated_cost: data.estimated_cost || 0,
  });

  const extractAction = (text: string): { clean: string; action: ChatAction | null } => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[1]) as ChatAction;
        const clean = text.replace(/```json\s*[\s\S]*?```/, "").trim();
        return { clean, action };
      } catch {
        return { clean: text, action: null };
      }
    }
    return { clean: text, action: null };
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/itinerary-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages.slice(1), userMsg].map((m) => ({ role: m.role, content: m.content })),
            itinerary_context: { ...itineraryContext, budget },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghubungi AI");
      }

      const data = await res.json();
      const { clean, action } = extractAction(data.message);

      if (action) {
        const applied = applyAction(action);
        if (applied) {
          toast({ title: "Itinerary diperbarui! ✅", description: `Aksi: ${action.action}` });
        }
        setMessages((prev) => [...prev, { role: "assistant", content: clean || "Done! Itinerary sudah saya perbarui. ✅" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Maaf, terjadi kesalahan: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={{ height: "min(500px, calc(100vh - 8rem))" }}
        >
          <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Tripsy Assistant</p>
              <p className="text-[10px] text-muted-foreground">Langsung ubah itinerary-mu</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-foreground border border-border/50"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <Input
              placeholder="Minta perubahan itinerary..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="text-xs h-9"
              disabled={loading}
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ItineraryChatbot;
