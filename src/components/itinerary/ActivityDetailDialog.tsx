import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Star, Clock, ExternalLink, Wallet } from "lucide-react";
import type { EnhancedItem } from "./ActivityCard";

interface Props {
  item: EnhancedItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<EnhancedItem>) => void;
}

const ActivityDetailDialog = ({ item, open, onClose, onSave }: Props) => {
  const [edited, setEdited] = useState<Partial<EnhancedItem>>({});

  const val = <K extends keyof EnhancedItem>(key: K): EnhancedItem[K] =>
    (edited[key] !== undefined ? edited[key] : item?.[key]) as EnhancedItem[K];

  const handleSave = () => {
    onSave(edited);
    setEdited({});
    onClose();
  };

  if (!item) return null;

  const mapsUrl = item.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${item.place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif">Detail Aktivitas</DialogTitle>
        </DialogHeader>

        {/* Image */}
        {val("image_url") && (
          <img
            src={val("image_url")!}
            alt={val("activity")}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        <div className="space-y-4">
          {/* Activity name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Aktivitas</label>
            <Input
              value={val("activity")}
              onChange={(e) => setEdited({ ...edited, activity: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lokasi</label>
            <div className="flex gap-2">
              <Input
                value={val("location")}
                onChange={(e) => setEdited({ ...edited, location: e.target.value })}
                className="text-sm flex-1"
              />
              <Button variant="outline" size="icon" className="shrink-0" asChild>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Time & Status */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Waktu</label>
              <Input
                type="time"
                value={val("time")}
                onChange={(e) => setEdited({ ...edited, time: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={val("status")} onValueChange={(v) => setEdited({ ...edited, status: v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="must">Must</SelectItem>
                  <SelectItem value="want">Want</SelectItem>
                  <SelectItem value="maybe">Maybe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
            <Textarea
              value={val("description")}
              onChange={(e) => setEdited({ ...edited, description: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimasi Biaya</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rp</span>
              <Input
                type="number"
                value={val("estimated_cost") || ""}
                onChange={(e) => setEdited({ ...edited, estimated_cost: Number(e.target.value) })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Rating */}
          {val("rating") && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="font-medium">{val("rating")}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailDialog;
