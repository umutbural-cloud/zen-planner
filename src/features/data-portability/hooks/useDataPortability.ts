import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { exportUserData, downloadExport } from "../exporter";
import { importUserData, type ImportProgress } from "../importer";
import { isExportFile, summarize, type ExportFile, type ImportSummary } from "../schema";

export type PendingImport = {
  file: ExportFile;
  summary: ImportSummary;
};

export function useDataPortability() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const exportNow = useCallback(async () => {
    if (!user) throw new Error("Giriş yapmanız gerekiyor");
    setExporting(true);
    try {
      const file = await exportUserData(user.id);
      downloadExport(file);
      return file;
    } finally {
      setExporting(false);
    }
  }, [user]);

  const previewImport = useCallback(async (raw: File) => {
    const text = await raw.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Dosya geçerli bir JSON değil");
    }
    if (!isExportFile(parsed)) {
      throw new Error("Bu dosya bir Keikaku yedeği değil veya bozulmuş");
    }
    const summary = summarize(parsed);
    setPending({ file: parsed, summary });
    return { file: parsed as ExportFile, summary };
  }, []);

  const confirmImport = useCallback(async () => {
    if (!user) throw new Error("Giriş yapmanız gerekiyor");
    if (!pending) throw new Error("Yüklenecek dosya yok");
    setImporting(true);
    setProgress(null);
    try {
      const res = await importUserData(user.id, pending.file, (p) => setProgress(p));
      setPending(null);
      setProgress(null);
      return res;
    } finally {
      setImporting(false);
    }
  }, [pending, user]);

  const cancelImport = useCallback(() => {
    setPending(null);
    setProgress(null);
  }, []);

  return {
    exporting,
    importing,
    progress,
    pending,
    exportNow,
    previewImport,
    confirmImport,
    cancelImport,
  };
}
