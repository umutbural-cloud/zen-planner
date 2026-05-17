import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PendingImport } from "../hooks/useDataPortability";
import type { ImportProgress } from "../importer";

type Props = {
  pending: PendingImport | null;
  importing: boolean;
  progress: ImportProgress | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const Row = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border/40 last:border-0">
    <span className="text-xs tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm font-light tabular-nums">{value}</span>
  </div>
);

export const ImportPreviewDialog = ({ pending, importing, progress, onCancel, onConfirm }: Props) => {
  const open = !!pending;
  const s = pending?.summary;
  const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !importing) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-light tracking-wide">
            取込 — Veri yükleme önizlemesi
          </DialogTitle>
        </DialogHeader>

        {s && (
          <div className="space-y-1 py-2">
            <Row label="Proje" value={s.projects} />
            <Row label="Görev" value={s.tasks} />
            <Row label="Not (klasik + defter)" value={s.notes} />
            <Row label="Hızlı not" value={s.quick_notes} />
            <Row label="Defter" value={s.notebooks} />
            <Row label="Alışkanlık" value={s.habits} />
            <Row label="Odak oturumu" value={s.pomodoro_sessions} />
            <Row label="Günlük kaydı" value={s.journal_entries} />
            <div className="pt-2 text-[10px] text-muted-foreground tracking-wide leading-relaxed">
              Bu kayıtlar mevcut hesabınıza eklenir. Aynı yedek daha önce yüklendiyse tekrar eden kayıtlar atlanır.
              Mevcut verileriniz silinmez.
            </div>
          </div>
        )}

        {importing && (
          <div className="space-y-2 pt-2">
            <Progress value={pct} className="h-1" />
            <div className="text-[10px] text-muted-foreground tracking-wide flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress ? `${progress.table} · ${progress.done}/${progress.total}` : "Hazırlanıyor…"}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={importing}>
            Vazgeç
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={importing || !s || s.total === 0}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span className="text-xs tracking-wide">İçe aktar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
