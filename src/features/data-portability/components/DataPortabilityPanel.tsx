import { useRef, useState } from "react";
import { Download, Upload, Loader2, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDataPortability } from "../hooks/useDataPortability";
import { ImportPreviewDialog } from "./ImportPreviewDialog";

type DataPortabilityPanelProps = {
  showIntroCopy?: boolean;
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const DataPortabilityPanel = ({ showIntroCopy = true }: DataPortabilityPanelProps) => {
  const {
    exporting, importing, progress, pending,
    exportNow, previewImport, confirmImport, cancelImport,
  } = useDataPortability();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const handleExport = async () => {
    try {
      await exportNow();
      toast.success("Yedek indirildi");
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Dışa aktarım başarısız"));
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setReading(true);
    try {
      await previewImport(file);
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Dosya okunamadı"));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await confirmImport();
      toast.success(`İçe aktarım tamam — ${res.inserted} kayıt eklendi${res.skipped ? `, ${res.skipped} mevcut atlandı` : ""}`);
      // Reload to pick up new data across all hooks.
      setTimeout(() => window.location.reload(), 600);
    } catch (e: unknown) {
      toast.error(errorMessage(e, "İçe aktarım başarısız"));
    }
  };

  return (
    <div className="space-y-3">
      {showIntroCopy && (
        <>
          <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase flex items-center gap-1.5">
            <FileJson className="h-3 w-3" /> Verilerim
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wide leading-relaxed">
            Bilgi merkezi dışındaki proje, görev, heybe, alışkanlık ve odak geçmişinizi JSON olarak
            indirin; başka bir hesaba veya ortama taşıyabilirsiniz. Sadece size ait veriler aktarılır.
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="flex-1"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="text-xs tracking-wide">Verilerimi indir</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={reading || importing}
          className="flex-1"
        >
          {(reading || importing) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span className="text-xs tracking-wide">Veri yükle</span>
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      <ImportPreviewDialog
        pending={pending}
        importing={importing}
        progress={progress}
        onCancel={cancelImport}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
