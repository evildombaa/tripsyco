import { useState } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItineraryV2Questionnaire from "@/components/itinerary-v2/ItineraryV2Questionnaire";
import ItineraryV2Swipe from "@/components/itinerary-v2/ItineraryV2Swipe";
import ItineraryV2Result from "@/components/itinerary-v2/ItineraryV2Result";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface V2Preferences {
  destination: string;
  date_start: string;
  date_end: string;
  active_hours_start: string;
  active_hours_end: string;
  travel_purposes: string[];
  travel_purpose_custom?: string;
  travel_companion: string;
  travel_companion_custom?: string;
  travel_style: string;
  travel_style_custom?: string;
  budget_range: string;
}

export interface RecommendedPlace {
  name: string;
  description: string;
  rating: number;
  photo_url: string | null;
  place_id: string | null;
  address: string;
}

type Mode = "questionnaire" | "loading" | "swipe" | "generating" | "result";

const ItineraryV2 = () => {
  const [mode, setMode] = useState<Mode>("questionnaire");
  const [preferences, setPreferences] = useState<V2Preferences | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedPlace[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<RecommendedPlace[]>([]);
  const [generatedItinerary, setGeneratedItinerary] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleQuestionnaireComplete = async (prefs: V2Preferences) => {
    if (!user) return;
    setPreferences(prefs);
    setMode("loading");

    try {
      // Save preferences to DB
      const { data: prefRow, error: prefErr } = await supabase
        .from("itinerary_v2_preferences" as any)
        .insert({
          user_id: user.id,
          destination: prefs.destination,
          date_start: prefs.date_start,
          date_end: prefs.date_end,
          active_hours_start: prefs.active_hours_start,
          active_hours_end: prefs.active_hours_end,
          travel_purposes: prefs.travel_purposes,
          travel_purpose_custom: prefs.travel_purpose_custom || null,
          travel_companion: prefs.travel_companion,
          travel_companion_custom: prefs.travel_companion_custom || null,
          travel_style: prefs.travel_style,
          travel_style_custom: prefs.travel_style_custom || null,
          budget_range: prefs.budget_range,
        } as any)
        .select()
        .single();

      if (prefErr) throw prefErr;
      setPreferenceId((prefRow as any).id);

      // Call edge function for recommendations
      const { data, error } = await supabase.functions.invoke("recommend-places-v2", {
        body: { preferences: prefs },
      });

      if (error) throw error;
      setRecommendations(data.places || []);
      setMode("swipe");
    } catch (e: any) {
      console.error("Error:", e);
      toast({ title: "Gagal memuat rekomendasi", description: e.message, variant: "destructive" });
      setMode("questionnaire");
    }
  };

  const handleSwipeComplete = async (liked: RecommendedPlace[]) => {
    if (!user || !preferenceId || !preferences) return;
    setLikedPlaces(liked);
    setMode("generating");

    try {
      // Save swipes to DB
      for (const place of liked) {
        await supabase.from("itinerary_v2_swipes" as any).insert({
          preference_id: preferenceId,
          user_id: user.id,
          place_name: place.name,
          place_description: place.description,
          place_rating: place.rating,
          place_photo_url: place.photo_url,
          place_id: place.place_id,
          place_address: place.address,
          liked: true,
        } as any);
      }

      // Generate itinerary from liked places
      const { data, error } = await supabase.functions.invoke("generate-itinerary-v2", {
        body: { preferences, liked_places: liked },
      });

      if (error) throw error;
      setGeneratedItinerary(data.itinerary);
      setMode("result");
    } catch (e: any) {
      console.error("Error:", e);
      toast({ title: "Gagal membuat itinerary", description: e.message, variant: "destructive" });
      setMode("swipe");
    }
  };

  const handleReset = () => {
    setMode("questionnaire");
    setPreferences(null);
    setPreferenceId(null);
    setRecommendations([]);
    setLikedPlaces([]);
    setGeneratedItinerary(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {mode === "questionnaire" && (
            <ItineraryV2Questionnaire onComplete={handleQuestionnaireComplete} />
          )}

          {(mode === "loading" || mode === "generating") && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-lg">
                {mode === "loading" ? "Mencari rekomendasi tempat wisata..." : "Menyusun itinerary untuk Anda..."}
              </p>
            </div>
          )}

          {mode === "swipe" && (
            <ItineraryV2Swipe
              places={recommendations}
              onComplete={handleSwipeComplete}
            />
          )}

          {mode === "result" && generatedItinerary && preferences && (
            <ItineraryV2Result
              itinerary={generatedItinerary}
              preferences={preferences}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ItineraryV2;
