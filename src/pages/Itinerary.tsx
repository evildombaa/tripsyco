import { useState, useEffect, useMemo } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryEditor, { DayPlan } from "@/components/ItineraryEditor";
import ItineraryFeedback from "@/components/ItineraryFeedback";
import ItineraryChatbot from "@/components/itinerary/ItineraryChatbot";
import QuestionnaireGame, { QuestionnaireAnswers } from "@/components/itinerary/QuestionnaireGame";
import ConflictDialog from "@/components/itinerary/ConflictDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { format, eachDayOfInterval } from "date-fns";


type Mode = "loading" | "manual" | "editor" | "feedback";

const Itinerary = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [tripName, setTripName] = useState("Perjalanan Baru");
  const [days, setDays] = useState<DayPlan[]>([]);
  const [budget, setBudget] = useState(0);
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | undefined>();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [conflictDates, setConflictDates] = useState<string[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<QuestionnaireAnswers | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load existing itinerary on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: itineraries } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (itineraries && itineraries.length > 0) {
        const itin = itineraries[0] as any;
        setItineraryId(itin.id);
        setTripName(itin.trip_name);
        setBudget(itin.budget || 0);

        // Load preferences for destination
        const { data: prefs } = await supabase
          .from("itinerary_preferences" as any)
          .select("destination")
          .eq("itinerary_id", itin.id)
          .limit(1);
        if (prefs && prefs.length > 0) {
          setDestination((prefs[0] as any).destination || "");
        }

        const { data: daysData } = await supabase
          .from("itinerary_days")
          .select("*")
          .eq("itinerary_id", itin.id)
          .order("sort_order", { ascending: true });

        if (daysData && daysData.length > 0) {
          const loadedDays: DayPlan[] = [];
          for (const d of daysData as any[]) {
            const { data: items } = await supabase
              .from("itinerary_day_items")
              .select("*")
              .eq("day_id", d.id)
              .order("sort_order", { ascending: true });

            loadedDays.push({
              id: d.id,
              date: d.trip_date || "",
              location: d.location || "",
              items: (items || []).map((item: any) => ({
                id: item.id,
                time: item.time_slot,
                activity: item.activity,
                location: item.location,
                status: item.status || "want",
                description: item.description || "",
                image_url: item.image_url || null,
                rating: item.rating || null,
                place_id: item.place_id || null,
                estimated_cost: item.estimated_cost || 0,
              })),
            });
          }
          setDays(loadedDays);
          setMode("editor");
          return;
        }
      }
      // No existing itinerary — empty editor
      setItineraryId(null);
      setTripName("Perjalanan Baru");
      setBudget(0);
      setDays([]);
      setMode("manual");
    };
    load();
  }, [user]);

  const handleFinish = () => {
    if (itineraryId) {
      setMode("feedback");
    } else {
      toast({ title: "Simpan dulu itinerary-mu sebelum finish!" });
    }
  };

  const handleFeedbackDone = async () => {
    if (itineraryId) {
      try {
        await supabase.from("itinerary_days").delete().eq("itinerary_id", itineraryId);
        await supabase.from("itinerary_feedback").delete().eq("itinerary_id", itineraryId);
        await supabase.from("itinerary_preferences").delete().eq("itinerary_id", itineraryId);
        await supabase.from("itineraries").delete().eq("id", itineraryId);
      } catch (e) {
        console.error("Error deleting itinerary:", e);
      }
    }
    setItineraryId(null);
    setTripName("Perjalanan Baru");
    setBudget(0);
    setDays([]);
    setRange(undefined);
    setMode("manual");
    toast({ title: "Itinerary selesai! 🎉", description: "Silakan buat itinerary baru." });
  };

  const handleDelete = async () => {
    if (!itineraryId) {
      // Nothing saved yet — just reset local state
      setTripName("Perjalanan Baru");
      setBudget(0);
      setDays([]);
      setRange(undefined);
      toast({ title: "Itinerary dibersihkan" });
      return;
    }
    if (!confirm("Hapus itinerary ini secara permanen? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeleting(true);
    try {
      await supabase.from("itinerary_days").delete().eq("itinerary_id", itineraryId);
      await supabase.from("itinerary_feedback").delete().eq("itinerary_id", itineraryId);
      await supabase.from("itinerary_preferences").delete().eq("itinerary_id", itineraryId);
      await supabase.from("itineraries").delete().eq("id", itineraryId);
      setItineraryId(null);
      setTripName("Perjalanan Baru");
      setBudget(0);
      setDestination("");
      setDays([]);
      setRange(undefined);
      setMode("manual");
      toast({ title: "Itinerary dihapus 🗑️" });
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Compute the list of dates in current range
  const rangeDates = useMemo<string[]>(() => {
    if (!range?.from) return [];
    const to = range.to || range.from;
    return eachDayOfInterval({ start: range.from, end: to }).map((d) => format(d, "yyyy-MM-dd"));
  }, [range]);

  const handleStartGenerate = () => {
    if (!range?.from) {
      toast({ title: "Pilih rentang tanggal terlebih dahulu", variant: "destructive" });
      return;
    }
    setShowQuestionnaire(true);
  };

  const runGenerate = async (answers: QuestionnaireAnswers, datesToGenerate: string[], replaceExisting: boolean) => {
    if (!user) return;
    if (datesToGenerate.length === 0) {
      toast({ title: "Tidak ada tanggal untuk di-generate" });
      return;
    }
    setGenerating(true);
    try {
      // 1. Ensure itinerary record exists
      let currentItinId = itineraryId;
      if (!currentItinId) {
        const { data: itin, error: itinErr } = await supabase
          .from("itineraries")
          .insert({ user_id: user.id, trip_name: `Perjalanan ke ${answers.destination}`, budget: answers.budget } as any)
          .select()
          .single();
        if (itinErr) throw itinErr;
        currentItinId = itin.id;
        setItineraryId(currentItinId);
        setTripName(itin.trip_name);
        setBudget(answers.budget);
      }

      // 2. Save/upsert preferences
      const prefPayload: any = {
        itinerary_id: currentItinId,
        destination: answers.destination,
        travel_purpose: answers.travel_purposes[0] || "",
        travel_purposes: answers.travel_purposes,
        travel_purpose_other: answers.travel_purpose_other || null,
        travel_companion: answers.travel_companion,
        travel_companion_other: answers.travel_companion_other || null,
        travel_style: answers.travel_style,
        travel_style_other: answers.travel_style_other || null,
        budget: String(answers.budget),
        budget_tier: answers.budget_tier,
        daily_hours_start: answers.daily_hours_start,
        daily_hours_end: answers.daily_hours_end,
        duration: `${rangeDates.length} hari`,
      };
      const { data: existingPref } = await supabase
        .from("itinerary_preferences")
        .select("id")
        .eq("itinerary_id", currentItinId)
        .limit(1);
      if (existingPref && existingPref.length > 0) {
        await supabase.from("itinerary_preferences").update(prefPayload).eq("itinerary_id", currentItinId);
      } else {
        await supabase.from("itinerary_preferences").insert(prefPayload);
      }
      setDestination(answers.destination);

      // 3. If replacing, delete existing days that conflict
      if (replaceExisting) {
        const { data: conflictDays } = await supabase
          .from("itinerary_days")
          .select("id, trip_date")
          .eq("itinerary_id", currentItinId)
          .in("trip_date", datesToGenerate);
        if (conflictDays && conflictDays.length) {
          const ids = conflictDays.map((d: any) => d.id);
          await supabase.from("itinerary_day_items").delete().in("day_id", ids);
          await supabase.from("itinerary_days").delete().in("id", ids);
        }
      }

      // 4. Fetch feedback for personalization
      const { data: fbData } = await supabase
        .from("itinerary_feedback")
        .select("rating, feedback_text, suggestions")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      const feedback = (fbData || []).map((f: any) => ({
        rating: f.rating,
        feedback: f.feedback_text,
        suggestions: f.suggestions,
      }));

      // 5. Call edge function
      const { data: genData, error: genErr } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          preferences: {
            destination: answers.destination,
            travel_purposes: answers.travel_purposes,
            travel_purpose: answers.travel_purposes.join(", "),
            travel_companion: answers.travel_companion,
            travel_style: answers.travel_style,
            budget: answers.budget,
            budget_tier: answers.budget_tier,
            daily_hours_start: answers.daily_hours_start,
            daily_hours_end: answers.daily_hours_end,
          },
          feedback,
          dates: datesToGenerate,
        },
      });
      if (genErr) throw genErr;
      const itinerary = genData?.itinerary;
      if (!itinerary?.days) throw new Error("Itinerary kosong dari AI");

      // 6. Insert generated days + items
      const newDays: DayPlan[] = [];
      // Determine current max sort_order
      const { data: existingAll } = await supabase
        .from("itinerary_days")
        .select("sort_order")
        .eq("itinerary_id", currentItinId)
        .order("sort_order", { ascending: false })
        .limit(1);
      let nextSort = ((existingAll?.[0] as any)?.sort_order ?? -1) + 1;

      for (const day of itinerary.days) {
        if (!datesToGenerate.includes(day.date)) continue; // safety
        const { data: dayRow, error: dErr } = await supabase
          .from("itinerary_days")
          .insert({
            itinerary_id: currentItinId,
            sort_order: nextSort++,
            trip_date: day.date,
            location: answers.destination,
          } as any)
          .select()
          .single();
        if (dErr) throw dErr;
        const insertedItems: any[] = [];
        for (let j = 0; j < (day.items || []).length; j++) {
          const it = day.items[j];
          const { data: itemRow } = await supabase
            .from("itinerary_day_items")
            .insert({
              day_id: dayRow.id,
              time_slot: it.time || "",
              activity: it.activity || "",
              location: it.location || "",
              sort_order: j,
              status: it.status || "want",
              description: it.description || "",
              image_url: it.image_url || it.photo_url || null,
              rating: it.rating || null,
              place_id: it.place_id || null,
              estimated_cost: it.estimated_cost || 0,
            } as any)
            .select()
            .single();
          if (itemRow) insertedItems.push(itemRow);
        }
        newDays.push({
          id: dayRow.id,
          date: day.date,
          location: answers.destination,
          items: insertedItems.map((i: any) => ({
            id: i.id,
            time: i.time_slot,
            activity: i.activity,
            location: i.location,
            status: i.status || "want",
            description: i.description || "",
            image_url: i.image_url || null,
            rating: i.rating || null,
            place_id: i.place_id || null,
            estimated_cost: i.estimated_cost || 0,
          })),
        });
      }

      // 7. Merge into state
      const remaining = days.filter((d) => !datesToGenerate.includes(d.date));
      setDays([...remaining, ...newDays].sort((a, b) => (a.date || "").localeCompare(b.date || "")));
      setMode("editor");
      toast({ title: "Itinerary berhasil dibuat! 🎉" });
    } catch (e: any) {
      console.error("Generate error:", e);
      toast({ title: "Gagal generate", description: e?.message || "Coba lagi", variant: "destructive" });
    } finally {
      setGenerating(false);
      setPendingAnswers(null);
      setConflictDates([]);
    }
  };

  const handleQuestionnaireComplete = async (answers: QuestionnaireAnswers) => {
    setShowQuestionnaire(false);
    const targetDates = rangeDates;
    // Detect conflicts among current days
    const existing = days.filter((d) => d.date && targetDates.includes(d.date) && d.items.length > 0);
    if (existing.length > 0) {
      setConflictDates(existing.map((d) => d.date));
      setPendingAnswers(answers);
      return;
    }
    await runGenerate(answers, targetDates, true);
  };

  const handleReplace = async () => {
    if (!pendingAnswers) return;
    await runGenerate(pendingAnswers, rangeDates, true);
  };

  const handleSkip = async () => {
    if (!pendingAnswers) return;
    const skipSet = new Set(conflictDates);
    const targetDates = rangeDates.filter((d) => !skipSet.has(d));
    await runGenerate(pendingAnswers, targetDates, false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (budget <= 0) {
      toast({ title: "Masukkan budget terlebih dahulu!", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (itineraryId) {
        await supabase.from("itineraries").update({ trip_name: tripName, budget } as any).eq("id", itineraryId);
        await supabase.from("itinerary_days").delete().eq("itinerary_id", itineraryId);
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const { data: dayRow, error: dayErr } = await supabase
            .from("itinerary_days")
            .insert({ itinerary_id: itineraryId, sort_order: i, trip_date: day.date || null, location: day.location || "" } as any)
            .select()
            .single();
          if (dayErr) throw dayErr;
          for (let j = 0; j < day.items.length; j++) {
            const item = day.items[j];
            await supabase.from("itinerary_day_items").insert({
              day_id: dayRow.id,
              time_slot: item.time,
              activity: item.activity,
              location: item.location,
              sort_order: j,
              status: item.status || "want",
              description: item.description || "",
              image_url: item.image_url || null,
              rating: item.rating || null,
              place_id: item.place_id || null,
              estimated_cost: item.estimated_cost || 0,
            } as any);
          }
        }
      } else {
        const { data: itin, error: itinErr } = await supabase
          .from("itineraries")
          .insert({ user_id: user.id, trip_name: tripName, budget } as any)
          .select()
          .single();
        if (itinErr) throw itinErr;
        setItineraryId(itin.id);
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const { data: dayRow, error: dayErr } = await supabase
            .from("itinerary_days")
            .insert({ itinerary_id: itin.id, sort_order: i, trip_date: day.date || null, location: day.location || "" } as any)
            .select()
            .single();
          if (dayErr) throw dayErr;
          for (let j = 0; j < day.items.length; j++) {
            const item = day.items[j];
            await supabase.from("itinerary_day_items").insert({
              day_id: dayRow.id,
              time_slot: item.time,
              activity: item.activity,
              location: item.location,
              sort_order: j,
              status: item.status || "want",
              description: item.description || "",
              image_url: item.image_url || null,
              rating: item.rating || null,
              place_id: item.place_id || null,
              estimated_cost: item.estimated_cost || 0,
            } as any);
          }
        }
      }
      toast({ title: "Tersimpan! ✅" });
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const itineraryContext = {
    trip_name: tripName,
    budget,
    destination,
    days: days.map((d, i) => ({
      day: i + 1,
      date: d.date,
      location: d.location,
      activities: d.items.map((item) => ({
        time: item.time,
        activity: item.activity,
        location: item.location,
        status: item.status,
        estimated_cost: item.estimated_cost,
      })),
    })),
    total_estimated_cost: days.reduce(
      (sum, d) => sum + d.items.reduce((s, i) => s + (i.estimated_cost || 0), 0),
      0
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {mode === "loading" && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {(mode === "manual" || mode === "editor") && (
            <>
              <ItineraryEditor
                tripName={tripName}
                setTripName={setTripName}
                days={days}
                setDays={setDays}
                budget={budget}
                setBudget={setBudget}
                destination={destination}
                onSave={handleSave}
                saving={saving}
                onDelete={handleDelete}
                deleting={deleting}
                range={range}
                onRangeChange={setRange}
                onGenerate={handleStartGenerate}
                generating={generating}
              />
              <div className="max-w-3xl mx-auto mt-8">
                <Button variant="outline" className="w-full" onClick={handleFinish}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Selesaikan Itinerary
                </Button>
              </div>
            </>
          )}
          {mode === "feedback" && itineraryId && (
            <ItineraryFeedback itineraryId={itineraryId} onDone={handleFeedbackDone} />
          )}
        </div>
      </div>
      <Footer />

      {/* AI Chatbot - visible when editing */}
      {(mode === "manual" || mode === "editor") && (
        <ItineraryChatbot itineraryContext={itineraryContext} days={days} setDays={setDays} budget={budget} setBudget={setBudget} />
      )}

      <QuestionnaireGame
        open={showQuestionnaire}
        onClose={() => setShowQuestionnaire(false)}
        onComplete={handleQuestionnaireComplete}
        numDays={rangeDates.length || 1}
      />

      <ConflictDialog
        open={conflictDates.length > 0 && !generating}
        conflictDates={conflictDates}
        onReplace={handleReplace}
        onSkip={handleSkip}
        onCancel={() => {
          setConflictDates([]);
          setPendingAnswers(null);
        }}
      />
    </div>
  );
};

export default Itinerary;
