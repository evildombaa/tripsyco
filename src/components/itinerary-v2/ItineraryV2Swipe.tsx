import { useState, useRef, useMemo } from "react";
import TinderCard from "react-tinder-card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MapPin, Star, RotateCcw } from "lucide-react";
import type { RecommendedPlace } from "@/pages/ItineraryV2";

interface Props {
  places: RecommendedPlace[];
  onComplete: (liked: RecommendedPlace[]) => void;
}

const ItineraryV2Swipe = ({ places, onComplete }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(places.length - 1);
  const [liked, setLiked] = useState<RecommendedPlace[]>([]);
  const [skipped, setSkipped] = useState<RecommendedPlace[]>([]);
  const [lastDirection, setLastDirection] = useState<string>("");
  const currentIndexRef = useRef(currentIndex);
  const childRefs = useMemo(() => Array(places.length).fill(0).map(() => React.createRef<any>()), [places.length]);

  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  const canSwipe = currentIndex >= 0;

  const swiped = (direction: string, place: RecommendedPlace, index: number) => {
    setLastDirection(direction);
    if (direction === "right") {
      setLiked((prev) => [...prev, place]);
    } else {
      setSkipped((prev) => [...prev, place]);
    }
    updateCurrentIndex(index - 1);
  };

  const outOfFrame = (name: string, idx: number) => {
    if (currentIndexRef.current >= idx) {
      childRefs[idx].current?.restoreCard();
    }
  };

  const swipe = async (dir: string) => {
    if (canSwipe && childRefs[currentIndex]?.current) {
      await childRefs[currentIndex].current.swipe(dir);
    }
  };

  const totalSwiped = liked.length + skipped.length;
  const allDone = totalSwiped === places.length;

  if (allDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Swipe Selesai! 🎉</h2>
        <p className="text-muted-foreground mb-2">
          Kamu menyukai <span className="text-primary font-semibold">{liked.length}</span> dari {places.length} tempat
        </p>
        {liked.length === 0 ? (
          <div className="mt-6">
            <p className="text-muted-foreground mb-4">Kamu belum menyukai tempat apapun. Coba lagi?</p>
            <Button onClick={() => { setLiked([]); setSkipped([]); updateCurrentIndex(places.length - 1); }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Ulangi
            </Button>
          </div>
        ) : (
          <Button onClick={() => onComplete(liked)} className="mt-6 gradient-primary border-0" size="lg">
            Buat Itinerary dari {liked.length} Tempat
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Swipe Destinasi</h2>
        <p className="text-sm text-muted-foreground">
          Geser kanan jika suka, kiri jika tidak • {totalSwiped + 1}/{places.length}
        </p>
      </div>

      <div className="relative h-[480px] w-full">
        {places.map((place, index) => (
          <TinderCard
            ref={childRefs[index]}
            key={place.name + index}
            onSwipe={(dir) => swiped(dir, place, index)}
            onCardLeftScreen={() => outOfFrame(place.name, index)}
            preventSwipe={["up", "down"]}
            className="absolute w-full"
          >
            <div
              className="relative h-[460px] rounded-2xl overflow-hidden shadow-xl bg-card border border-border select-none"
              style={{ touchAction: "pan-y" }}
            >
              {/* Photo Background */}
              <div className="absolute inset-0">
                {place.photo_url ? (
                  <img
                    src={place.photo_url}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  {place.rating && (
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {place.rating}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-1">{place.name}</h3>
                {place.address && (
                  <p className="text-sm text-white/70 flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" /> {place.address}
                  </p>
                )}
                <p className="text-sm text-white/90 line-clamp-3">{place.description}</p>
              </div>

              {/* Swipe Indicators */}
              {lastDirection === "right" && index === currentIndex + 1 && (
                <div className="absolute top-6 left-6 bg-green-500/90 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-[-15deg]">
                  SUKA!
                </div>
              )}
              {lastDirection === "left" && index === currentIndex + 1 && (
                <div className="absolute top-6 right-6 bg-red-500/90 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-[15deg]">
                  SKIP
                </div>
              )}
            </div>
          </TinderCard>
        ))}
      </div>

      {/* Swipe Buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => swipe("left")}
          disabled={!canSwipe}
        >
          <ThumbsDown className="h-6 w-6" />
        </Button>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white border-0"
          onClick={() => swipe("right")}
          disabled={!canSwipe}
        >
          <ThumbsUp className="h-6 w-6" />
        </Button>
      </div>

      {/* Liked counter */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        ❤️ {liked.length} tempat disukai
      </p>
    </div>
  );
};

import React from "react";
export default ItineraryV2Swipe;
