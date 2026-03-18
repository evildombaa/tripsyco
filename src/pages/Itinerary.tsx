import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryEditor, { DayPlan } from "@/components/ItineraryEditor";
import ItineraryFeedback from "@/components/ItineraryFeedback";
import ItineraryChatbot from "@/components/itinerary/ItineraryChatbot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { EnhancedItem } from "@/components/itinerary/ActivityCard";

type Mode = "loading" | "manual" | "editor" | "feedback";

const Itinerary = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [tripName, setTripName] = useState("Perjalanan Baru");
  const [days, setDays] = useState<DayPlan[]>([]);
  const [budget, setBudget] = useState(0);
  const [destination, setDestination] = useState("");
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
      // No existing itinerary — go directly to manual editor
      setItineraryId(null);
      setTripName("Perjalanan Baru");
      setBudget(0);
      setDays([{ id: Date.now().toString(), date: "", location: "", items: [] }]);
      setMode("manual");
    };
    load();
  }, [user]);

  const handleManual = () => {
    setItineraryId(null);
    setTripName("Perjalanan Baru");
    setBudget(0);
    setDays([{ id: Date.now().toString(), date: "", location: "", items: [] }]);
    setMode("manual");
  };

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
    setDays([{ id: Date.now().toString(), date: "", location: "", items: [] }]);
    setMode("manual");
    toast({ title: "Itinerary selesai! 🎉", description: "Silakan buat itinerary baru." });
  };

  const handleAIComplete = async (prefs: ItineraryPreferences) => {
    setMode("ai-generating");
    setDestination(prefs.destination);
    try {
      const { data: itin, error: itinErr } = await supabase
        .from("itineraries")
        .insert({ user_id: user!.id, trip_name: `Perjalanan ke ${prefs.destination}`, budget: 0 } as any)
        .select()
        .single();
      if (itinErr) throw itinErr;
      setItineraryId(itin.id);

      await supabase.from("itinerary_preferences" as any).insert({
        itinerary_id: itin.id,
        destination: prefs.destination,
        travel_purpose: prefs.travel_purpose,
        travel_purpose_other: prefs.travel_purpose_other || null,
        travel_companion: prefs.travel_companion,
        travel_companion_other: prefs.travel_companion_other || null,
        travel_style: prefs.travel_style,
        travel_style_other: prefs.travel_style_other || null,
        budget: String(prefs.budget),
        duration: prefs.duration,
        duration_other: prefs.duration_other || null,
      } as any);

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
              departure_date: prefs.departure_date,
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
      setBudget(Number(prefs.budget) || 0);

      // Calculate dates from departure_date
      const departureDate = prefs.departure_date ? new Date(prefs.departure_date) : null;

      const generatedDays: DayPlan[] = [];
      for (let i = 0; i < itinerary.days.length; i++) {
        const dayData = itinerary.days[i];
        
        // Use date from AI response or calculate from departure
        let tripDate: string | null = dayData.date || null;
        if (!tripDate && departureDate) {
          const d = new Date(departureDate);
          d.setDate(d.getDate() + i);
          tripDate = d.toISOString().split("T")[0];
        }

        const { data: dayRow, error: dayErr } = await supabase
          .from("itinerary_days")
          .insert({
            itinerary_id: itin.id,
            sort_order: i,
            trip_date: tripDate,
            location: prefs.destination,
          } as any)
          .select()
          .single();
        if (dayErr) throw dayErr;

        const items = dayData.items || [];
        const localItems: EnhancedItem[] = [];
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
              status: item.status || "want",
              description: item.description || "",
              image_url: item.photo_url || null,
              rating: item.rating || null,
              place_id: item.place_id || null,
              estimated_cost: item.estimated_cost || 0,
            } as any)
            .select()
            .single();
          if (itemErr) throw itemErr;
          const row = itemRow as any;
          localItems.push({
            id: row.id,
            time: row.time_slot,
            activity: row.activity,
            location: row.location,
            status: row.status || "want",
            description: row.description || "",
            image_url: row.image_url || null,
            rating: row.rating || null,
            place_id: row.place_id || null,
            estimated_cost: row.estimated_cost || 0,
          });
        }
        generatedDays.push({
          id: dayRow.id,
          date: tripDate || "",
          location: (dayRow as any).location || prefs.destination,
          items: localItems,
        });
      }

      await supabase
        .from("itineraries")
        .update({ trip_name: itinerary.trip_name || `Perjalanan ke ${prefs.destination}`, budget: Number(prefs.budget) || 0 })
        .eq("id", itin.id);
      setDays(generatedDays);
      setMode("editor");
      toast({ title: "Itinerary berhasil dibuat! 🎉", description: "Kamu bisa mengedit sesuai keinginan." });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Gagal membuat itinerary", description: error.message, variant: "destructive" });
      setMode("manual");
    }
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
    </div>
  );
};

export default Itinerary;
