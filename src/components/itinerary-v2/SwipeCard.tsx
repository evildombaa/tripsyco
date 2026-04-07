import { useState, useRef } from "react";
import { Star, X, Heart, MapPin } from "lucide-react";

interface Place {
  name: string;
  description: string;
  rating: number;
  photo_url: string | null;
  place_id: string | null;
  address: string | null;
}

interface Props {
  place: Place;
  onSwipe: (liked: boolean) => void;
}

const SwipeCard = ({ place, onSwipe }: Props) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);

  const handleStart = (clientX: number) => {
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    setDragX(clientX - startX.current);
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (Math.abs(dragX) > 100) {
      const liked = dragX > 0;
      setExiting(liked ? "right" : "left");
      setTimeout(() => onSwipe(liked), 300);
    } else {
      setDragX(0);
    }
  };

  const swipeAction = (liked: boolean) => {
    setExiting(liked ? "right" : "left");
    setTimeout(() => onSwipe(liked), 300);
  };

  const rotation = dragX * 0.05;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 400);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className={`relative rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing transition-transform ${
          exiting === "left" ? "animate-swipe-left" : exiting === "right" ? "animate-swipe-right" : ""
        }`}
        style={{
          transform: exiting ? undefined : `translateX(${dragX}px) rotate(${rotation}deg)`,
          opacity: exiting ? 0 : opacity,
          transition: isDragging ? "none" : "transform 0.3s, opacity 0.3s",
        }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => isDragging && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* Swipe indicator overlays */}
        {dragX > 50 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/30 pointer-events-none">
            <Heart className="h-20 w-20 text-green-500 fill-green-500" />
          </div>
        )}
        {dragX < -50 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/30 pointer-events-none">
            <X className="h-20 w-20 text-red-500" />
          </div>
        )}

        {/* Image */}
        <div className="h-[400px] bg-muted">
          {place.photo_url ? (
            <img
              src={place.photo_url}
              alt={place.name}
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent">
              <MapPin className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
          <h3 className="text-2xl font-bold mb-1">{place.name}</h3>
          {place.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
            </div>
          )}
          <p className="text-sm text-white/80 line-clamp-2">{place.description}</p>
          {place.address && (
            <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {place.address}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <button
          onClick={() => swipeAction(false)}
          className="h-16 w-16 rounded-full border-2 border-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
        >
          <X className="h-7 w-7 text-destructive" />
        </button>
        <button
          onClick={() => swipeAction(true)}
          className="h-16 w-16 rounded-full border-2 border-green-500 flex items-center justify-center hover:bg-green-500/10 transition-colors"
        >
          <Heart className="h-7 w-7 text-green-500" />
        </button>
      </div>
    </div>
  );
};

export default SwipeCard;
