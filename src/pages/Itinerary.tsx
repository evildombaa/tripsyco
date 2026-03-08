import { useState, useEffect } from "react";
import { Sparkles, PenLine, Loader2, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryEditor, { DayPlan } from "@/components/ItineraryEditor";
import ItineraryQuestionnaire, { ItineraryPreferences } from "@/components/ItineraryQuestionnaire";
import ItineraryFeedback from "@/components/ItineraryFeedback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Mode = "loading" | "choose" | "manual" | "ai-questionnaire" | "ai-generating" | "editor" | "feedback";

const Itinerary = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [tripName, setTripName] = useState("Perjalanan Baru");
  const [days, setDays] = useState<DayPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [itineraryId, setItineraryId] = useState<string | null>(null);
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
        const itin = itineraries[0];
        setItineraryId(itin.id);
        setTripName(itin.trip_name);

        const { data: daysData } = await supabase
          .from("itinerary_days")
          .select("*")
          .eq("itinerary_id", itin.id)
          .order("sort_order", { ascending: true });

        if (daysData && daysData.length > 0) {
          const loadedDays: DayPlan[] = [];
          for (const d of daysData) {
            const { data: items } = await supabase
              .from("itinerary_day_items")
              .select("*")
              .eq("day_id", d.id)
              .order("sort_order", { ascending: true });

            loadedDays.push({
              id: d.id,
              date: d.trip_date || "",
              items: (items || []).map((item) => ({
                id: item.id,
                time: item.time_slot,
                activity: item.activity,
                location: item.location,
              })),
            });
          }
          setDays(loadedDays);
          setMode("editor");
          return;
        }
      }
      setMode("choose");
    };
    load();
  }, [user]);

  const handleManual = () => {
    setItineraryId(null);
    setTripName("Perjalanan Baru");
    setDays([{ id: Date.now().toString(), date: "", items: [] }]);
    setMode("manual");
  };

  const handleNewItinerary = () => {
    setItineraryId(null);
    setTripName("Perjalanan Baru");
    setDays([]);
    setMode("choose");
  };

  const handleFinish = () => {
    if (itineraryId) {
      setMode("feedback");
    } else {
      toast({ title: "Simpan dulu itinerary-mu sebelum finish!" });
    }
  };

  const handleFeedbackDone = () => {
    // Reload the editor
    setMode("editor");
    toast({ title: "Itinerary selesai! 🎉" });
  };

  const handleAIComplete = async (prefs: ItineraryPreferences) => {
    setMode("ai-generating");
    try {
      const { data: itin, error: itinErr } = await supabase
        .from("itineraries")
        .insert({ user_id: user!.id, trip_name: `Perjalanan ke ${prefs.destination}` })
        .select()
        .single();
      if (itinErr) throw itinErr;
      setItineraryId(itin.id);

      // Save preferences
      await supabase.from("itinerary_preferences" as any).insert({
        itinerary_id: itin.id,
        destination: prefs.destination,
        travel_purpose: prefs.travel_purpose,
        travel_purpose_other: prefs.travel_purpose_other || null,
        travel_companion: prefs.travel_companion,
        travel_companion_other: prefs.travel_companion_other || null,
        travel_style: prefs.travel_style,
        travel_style_other: prefs.travel_style_other || null,
        budget: prefs.budget,
        duration: prefs.duration,
        duration_other: prefs.duration_other || null,
      } as any);

      // Fetch past feedback for personalization
      const { data: feedbackData } = await supabase
        .from("itinerary_feedback" as any)
        .select("rating, feedback_text, suggestions")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            preferences: {
              destination: prefs.destination,
              travel_purpose: prefs.travel_purpose_other || prefs.travel_purpose,
              travel_companion: prefs.travel_companion_other || prefs.travel_companion,
              travel_style: prefs.travel_style_other || prefs.travel_style,
              budget: prefs.budget,
              duration: prefs.duration_other || prefs.duration,
            },
            feedback: (feedbackData || []).map((f: any) => ({
              rating: f.rating,
              feedback: f.feedback_text,
              suggestions: f.suggestions,
            })),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal generate itinerary");
      }

      const { itinerary } = await res.json();
      setTripName(itinerary.trip_name || `Perjalanan ke ${prefs.destination}`);

      const generatedDays: DayPlan[] = [];
      for (let i = 0; i < itinerary.days.length; i++) {
        const dayData = itinerary.days[i];
        const { data: dayRow, error: dayErr } = await supabase
          .from("itinerary_days")
          .insert({ itinerary_id: itin.id, sort_order: i, trip_date: null })
          .select()
          .single();
        if (dayErr) throw dayErr;

        const items = dayData.items || [];
        const localItems = [];
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const { data: itemRow, error: itemErr } = await supabase
            .from("itinerary_day_items")
            .insert({
              day_id: dayRow.id,
              time_slot: item.time || "",
              activity: item.activity || "",
              location: item.location || "",
              sort_order: j,
            })
            .select()
            .single();
          if (itemErr) throw itemErr;
          localItems.push({ id: itemRow.id, time: itemRow.time_slot, activity: itemRow.activity, location: itemRow.location });
        }
        generatedDays.push({ id: dayRow.id, date: dayRow.trip_date || "", items: localItems });
      }

      await supabase.from("itineraries").update({ trip_name: itinerary.trip_name || `Perjalanan ke ${prefs.destination}` }).eq("id", itin.id);
      setDays(generatedDays);
      setMode("editor");
      toast({ title: "Itinerary berhasil dibuat! 🎉", description: "Kamu bisa mengedit sesuai keinginan." });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Gagal membuat itinerary", description: error.message, variant: "destructive" });
      setMode("choose");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (itineraryId) {
        await supabase.from("itineraries").update({ trip_name: tripName }).eq("id", itineraryId);
        await supabase.from("itinerary_days").delete().eq("itinerary_id", itineraryId);
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const { data: dayRow, error: dayErr } = await supabase
            .from("itinerary_days")
            .insert({ itinerary_id: itineraryId, sort_order: i, trip_date: day.date || null })
            .select().single();
          if (dayErr) throw dayErr;
          for (let j = 0; j < day.items.length; j++) {
            const item = day.items[j];
            await supabase.from("itinerary_day_items").insert({ day_id: dayRow.id, time_slot: item.time, activity: item.activity, location: item.location, sort_order: j });
          }
        }
      } else {
        const { data: itin, error: itinErr } = await supabase
          .from("itineraries").insert({ user_id: user.id, trip_name: tripName }).select().single();
        if (itinErr) throw itinErr;
        setItineraryId(itin.id);
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const { data: dayRow, error: dayErr } = await supabase
            .from("itinerary_days").insert({ itinerary_id: itin.id, sort_order: i, trip_date: day.date || null }).select().single();
          if (dayErr) throw dayErr;
          for (let j = 0; j < day.items.length; j++) {
            const item = day.items[j];
            await supabase.from("itinerary_day_items").insert({ day_id: dayRow.id, time_slot: item.time, activity: item.activity, location: item.location, sort_order: j });
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

          {mode === "choose" && (
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-3">Buat Itinerary Baru</h1>
              <p className="text-muted-foreground mb-10">Pilih cara membuat rencana perjalananmu</p>
              <div className="grid sm:grid-cols-2 gap-6">
                <Card className="p-8 border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={handleManual}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <PenLine className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Buat Manual</h3>
                    <p className="text-sm text-muted-foreground">Susun sendiri aktivitas, waktu, dan lokasi perjalananmu</p>
                  </div>
                </Card>
                <Card className="p-8 border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => setMode("ai-questionnaire")}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Sparkles className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Buat Otomatis</h3>
                    <p className="text-sm text-muted-foreground">Jawab beberapa pertanyaan, AI akan buatkan itinerary untukmu</p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {mode === "ai-questionnaire" && (
            <ItineraryQuestionnaire onComplete={handleAIComplete} onBack={() => setMode("choose")} />
          )}

          {mode === "ai-generating" && (
            <div className="max-w-lg mx-auto text-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
              <h2 className="text-xl font-bold font-serif text-foreground mb-2">Sedang membuat itinerary...</h2>
              <p className="text-muted-foreground text-sm">AI sedang merangkai rencana perjalanan terbaik untukmu.</p>
            </div>
          )}

          {(mode === "manual" || mode === "editor") && (
            <>
              <ItineraryEditor
                tripName={tripName}
                setTripName={setTripName}
                days={days}
                setDays={setDays}
                onSave={handleSave}
                saving={saving}
              />
              <div className="max-w-3xl mx-auto mt-8 flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={handleFinish}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Selesaikan Itinerary
                </Button>
                <Button variant="ghost" className="flex-1" onClick={handleNewItinerary}>
                  <Plus className="h-4 w-4 mr-2" /> Buat Itinerary Baru
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
    </div>
  );
};

export default Itinerary;
