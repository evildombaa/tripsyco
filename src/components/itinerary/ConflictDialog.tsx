import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Props {
  open: boolean;
  conflictDates: string[]; // yyyy-MM-dd
  onReplace: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

const ConflictDialog = ({ open, conflictDates, onReplace, onSkip, onCancel }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Itinerary sudah ada di beberapa tanggal</DialogTitle>
          <DialogDescription>
            Pada tanggal berikut sudah ada itinerary yang dibuat:
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm text-foreground space-y-1 max-h-40 overflow-auto px-1">
          {conflictDates.map((d) => {
            const [y, m, dd] = d.split("-").map(Number);
            return (
              <li key={d} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {format(new Date(y, m - 1, dd), "EEEE, dd MMMM yyyy", { locale: localeId })}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          Mau diganti dengan itinerary baru, atau biarkan yang lama dan lewati tanggal-tanggal itu?
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
            Biarkan & Lewati
          </Button>
          <Button onClick={onReplace} className="gradient-primary border-0 w-full sm:w-auto">
            Ganti dengan Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictDialog;