import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  itineraryId: string;
  onDone: () => void;
}

const ItineraryFeedback = ({ itineraryId, onDone }: Props) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("itinerary_feedback" as any).insert({
        user_id: user.id,
        itinerary_id: itineraryId,
        rating,
        feedback_text: feedbackText.trim(),
        suggestions: suggestions.trim(),
      } as any);
      if (error) throw error;
      toast({ title: "Terima kasih atas feedback-nya! 🙏" });
      onDone();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan feedback", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto p-8 border-border/50">
      <h2 className="text-xl font-bold font-serif text-foreground text-center mb-2">
        Bagaimana itinerary-nya?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Feedback-mu akan membantu kami membuat itinerary yang lebih baik untukmu
      </p>

      {/* Star rating */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Apa pendapatmu tentang itinerary ini?
          </label>
          <Textarea
            placeholder="Misalnya: Tempatnya bagus, tapi waktunya terlalu padat..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Ada saran untuk perbaikan?
          </label>
          <Textarea
            placeholder="Misalnya: Tambahkan lebih banyak tempat makan, kurangi aktivitas outdoor..."
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          Lewati
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={rating === 0 || saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kirim Feedback
        </Button>
      </div>
    </Card>
  );
};

export default ItineraryFeedback;
