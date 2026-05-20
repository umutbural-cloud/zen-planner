/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, SCHEMA_VERSION, TABLES, type ExportFile, type TableName } from "./schema";

const PAGE_SIZE = 500;
const MAX_EXPORT_ROWS_PER_TABLE = 10000;
const EXPORT_TOO_LARGE_MESSAGE = "Dışa aktarılacak veri çok büyük. Lütfen veriyi parçalara bölün veya destek alın.";

// Pull all rows for the current user across whitelisted tables.
export async function exportUserData(userId: string): Promise<ExportFile> {
  const data: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const t of TABLES) {
    const rows: any[] = [];
    for (let offset = 0; offset <= MAX_EXPORT_ROWS_PER_TABLE; offset += PAGE_SIZE) {
      const { data: page, error } = await supabase
        .from(t.name as any)
        .select("*")
        .eq("user_id", userId)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`${t.name}: ${error.message}`);
      rows.push(...(page || []));
      if (!page || page.length < PAGE_SIZE) break;
      if (rows.length >= MAX_EXPORT_ROWS_PER_TABLE) {
        throw new Error(EXPORT_TOO_LARGE_MESSAGE);
      }
    }
    // Strip server-managed user_id; keep everything else (including stable_export_id, deleted_at).
    const cleaned = rows.map((r: any) => {
      const { user_id, ...rest } = r;
      return rest;
    });
    data[t.name] = cleaned;
    counts[t.name] = cleaned.length;
  }

  // user_settings: single row, strip user_id
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  let cleanedSettings: any = null;
  if (settings) {
    const { user_id, ...rest } = settings as any;
    cleanedSettings = rest;
    counts["user_settings"] = 1;
  }

  return {
    app_name: APP_NAME,
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    export_id: crypto.randomUUID(),
    user_data_only: true,
    data: { ...(data as Partial<Record<TableName, any[]>>), user_settings: cleanedSettings },
    counts,
  };
}

export function downloadExport(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `keikaku-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
