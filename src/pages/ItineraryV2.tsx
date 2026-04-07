import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryV2Questionnaire, { V2Preferences } from "@/components/itinerary-v2/ItineraryV2Questionnaire";
import SwipeCard from "@/components/itinerary-v2/SwipeCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface PlaceRecommendation {
  name: string;
  description: string;
  rating: number;
  photo_url: string | null;
  place_id: string | null;
  address: string | null;
}

const ItineraryV2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"questionnaire" | "loading" | "swipe" | "generating" | "done">("questionnaire");
  const [preferences, setPreferences] = useState<V2Preferences | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceRecommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedPlaces, setLikedPlaces] = useState<PlaceRecommendation[]>([]);

  const savePreferences = async (prefs: V2Preferences) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("itinerary_v2_preferences")
      .insert({
        user_id: user.id,
        destination: prefs.destination,
        date_start: prefs.dateStart,
        date_end: prefs.dateEnd,
        active_hours_start: prefs.activeHoursStart,
        active_hours_end: prefs.activeHoursEnd,
        travel_purposes: prefs.travelPurposes,
        travel_purpose_custom: prefs.travelPurposeCustom || null,
        travel_companion: prefs.travelCompanion,
        travel_companion_custom: prefs.travelCompanionCustom || null,
        travel_style: prefs.travelStyle,
        travel_style_custom: prefs.travelStyleCustom || null,
        budget_range: prefs.budgetRange,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Save preferences error:", error);
      toast.error("Gagal menyimpan preferensi");
      return null;
    }
    return data.id;
  };

  const fetchRecommendations = async (prefs: V2Preferences) => {
    const { data, error } = await supabase.functions.invoke("v2-recommend", {
      body: {
        destination: prefs.destination,
        purposes: prefs.travelPurposes,
        purpose_custom: prefs.travelPurposeCustom,
        companion: prefs.travelCompanion,
        style: prefs.travelStyle,
        budget: prefs.budgetRange,
      },
    });

    if (error) throw error;
    return (data?.places || []) as PlaceRecommendation[];
  };

  const handleQuestionnaireComplete = async (prefs: V2Preferences) => {
    setPreferences(prefs);
    setPhase("loading");

    try {
      const [prefId, recs] = await Promise.all([savePreferences(prefs), fetchRecommendations(prefs)]);

      if (!prefId) {
        setPhase("questionnaire");
        return;
      }

      setPreferenceId(prefId);

      if (recs.length === 0) {
        toast.error("Tidak ada rekomendasi ditemukan. Coba tujuan lain.");
        setPhase("questionnaire");
        return;
      }

      setPlaces(recs);
      setCurrentIndex(0);
      setPhase("swipe");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mendapatkan rekomendasi");
      setPhase("questionnaire");
    }
  };

  const handleSwipe = async (liked: boolean) => {
    const place = places[currentIndex];

    if (liked) {
      setLikedPlaces((prev) => [...prev, place]);
    }

    // Save swipe to DB
    if (user && preferenceId) {
      await supabase.from("itinerary_v2_swipes").insert({
        user_id: user.id,
        preference_id: preferenceId,
        place_name: place.name,
        place_description: place.description,
        place_rating: place.rating,
        place_photo_url: place.photo_url,
        place_id: place.place_id,
        place_address: place.address,
        liked,
      });
    }

    if (currentIndex + 1 >= places.length) {
      // All cards swiped
      if (liked) {
        // Include current liked
        generateItinerary([...likedPlaces, place]);
      } else {
        generateItinerary(likedPlaces);
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const generateItinerary = async (liked: PlaceRecommendation[]) => {
    if (liked.length === 0) {
      toast.error("Anda belum menyukai tempat manapun. Coba lagi!");
      setPhase("questionnaire");
      return;
    }

    setPhase("generating");

    try {
      if (!user || !preferences) return;

      // Create itinerary via generate function
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          preferences: {
            destination: preferences.destination,
            travel_purpose: [...preferences.travelPurposes, preferences.travelPurposeCustom].filter(Boolean).join(", "),
            travel_companion: preferences.travelCompanionCustom || preferences.travelCompanion,
            travel_style: preferences.travelStyleCustom || preferences.travelStyle,
            budget: getBudgetNumber(preferences.budgetRange),
            duration: getDuration(preferences.dateStart, preferences.dateEnd),
            departure_date: preferences.dateStart,
          },
        },
      });

      if (error) throw error;

      const itinerary = data?.itinerary;
      if (!itinerary) throw new Error("No itinerary returned");

      // Save to DB
      const { data: itinRow, error: itinErr } = await supabase
        .from("itineraries")
        .insert({
          user_id: user.id,
          trip_name: itinerary.trip_name || `Trip ke ${preferences.destination}`,
          budget: getBudgetNumber(preferences.budgetRange),
        })
        .select("id")
        .single();

      if (itinErr) throw itinErr;

      for (let di = 0; di < (itinerary.days || []).length; di++) {
        const day = itinerary.days[di];
        const { data: dayRow, error: dayErr } = await supabase
          .from("itinerary_days")
          .insert({
            itinerary_id: itinRow.id,
            sort_order: di,
            trip_date: day.date || null,
            location: preferences.destination,
          })
          .select("id")
          .single();

        if (dayErr) throw dayErr;

        for (let ii = 0; ii < (day.items || []).length; ii++) {
          const item = day.items[ii];
          await supabase.from("itinerary_day_items").insert({
            day_id: dayRow.id,
            sort_order: ii,
            time_slot: item.time || "",
            activity: item.activity || "",
            location: item.location || "",
            status: item.status || "want",
            description: item.description || "",
            estimated_cost: item.estimated_cost || 0,
            rating: item.rating || null,
            place_id: item.place_id || null,
            image_url: item.photo_url || null,
          });
        }
      }

      setPhase("done");
      toast.success("Itinerary berhasil dibuat!");

      setTimeout(() => navigate("/itinerary"), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat itinerary");
      setPhase("questionnaire");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        {phase === "questionnaire" && (
          <ItineraryV2Questionnaire onComplete={handleQuestionnaireComplete} />
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Mencari tempat terbaik untuk Anda...</p>
          </div>
        )}

        {phase === "swipe" && places[currentIndex] && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Rekomendasi untuk Anda</h2>
              <p className="text-sm text-muted-foreground">
                Swipe kanan jika suka, kiri jika tidak • {currentIndex + 1}/{places.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ❤️ {likedPlaces.length} tempat disukai
              </p>
            </div>
            <SwipeCard place={places[currentIndex]} onSwipe={handleSwipe} />
          </div>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Sparkles className="h-10 w-10 animate-pulse text-primary" />
            <p className="text-muted-foreground">Menyusun itinerary dari {likedPlaces.length} tempat favorit Anda...</p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h2 className="text-xl font-bold text-foreground">Itinerary siap!</h2>
            <p className="text-muted-foreground">Mengalihkan ke halaman itinerary...</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

function getBudgetNumber(range: string): number {
  switch (range) {
    case "hemat": return 750000;
    case "menengah": return 3500000;
    case "nyaman": return 8500000;
    case "premium": return 15000000;
    default: return 3500000;
  }
}

function getDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "3";
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return String(days);
}

export default ItineraryV2;
