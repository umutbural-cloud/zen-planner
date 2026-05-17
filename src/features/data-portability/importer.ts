/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { TABLES, type ExportFile } from "./schema";

export type ImportProgress = {
  table: string;
  done: number;
  total: number;
};

// Dynamic Supabase table access is intentionally isolated in this import boundary.
// The caller receives a typed ExportFile, while table-specific payloads are validated by
// the whitelist in schema.ts and by database constraints during insert/update.
export async function importUserData(
  userId: string,
  file: ExportFile,
  onProgress?: (p: ImportProgress) => void,
): Promise<{ inserted: number; skipped: number }> {
  const idMap: Record<string, Map<string, string>> = {};
  let inserted = 0;
  let skipped = 0;

  for (const t of TABLES) {
    const rows = (file.data[t.name] as any[]) || [];
    idMap[t.name] = new Map();
    if (rows.length === 0) {
      onProgress?.({ table: t.name, done: 0, total: 0 });
      continue;
    }

    const stableIds = rows.map((r) => r.stable_export_id).filter(Boolean);
    const existing = new Map<string, string>();
    if (stableIds.length) {
      for (let i = 0; i < stableIds.length; i += 500) {
        const chunk = stableIds.slice(i, i + 500);
        const { data: ex } = await supabase
          .from(t.name as any)
          .select("id, stable_export_id")
          .eq("user_id", userId)
          .in("stable_export_id", chunk);
        (ex || []).forEach((row: any) => existing.set(row.stable_export_id, row.id));
      }
    }

    const payloads: any[] = [];
    for (const row of rows) {
      const existsId = row.stable_export_id ? existing.get(row.stable_export_id) : undefined;
      if (existsId && row.id) {
        idMap[t.name].set(row.id, existsId);
        skipped++;
        continue;
      }

      const newRow: any = { ...row };
      const oldId = row.id as string | undefined;
      const newId = crypto.randomUUID();
      newRow.id = newId;
      newRow.user_id = userId;
      if (!newRow.stable_export_id) newRow.stable_export_id = crypto.randomUUID();

      for (const [col, refTable] of Object.entries(t.fk)) {
        const oldFk = newRow[col];
        if (oldFk && refTable) {
          const mapped = idMap[refTable]?.get(oldFk);
          newRow[col] = mapped ?? null;
        }
      }

      if (t.name === "projects") delete newRow.is_default;

      if (oldId) idMap[t.name].set(oldId, newId);
      payloads.push({ original: row, payload: newRow });
    }

    let done = 0;
    for (let i = 0; i < payloads.length; i += 200) {
      const chunk = payloads.slice(i, i + 200).map((p) => p.payload);
      const { error } = await supabase.from(t.name as any).insert(chunk);
      if (error) throw new Error(`${t.name}: ${error.message}`);
      inserted += chunk.length;
      done += chunk.length;
      onProgress?.({ table: t.name, done, total: payloads.length });
    }

    const selfRefs = Object.entries(t.fk).filter(([, ref]) => ref === t.name);
    if (selfRefs.length) {
      for (const { original, payload } of payloads) {
        for (const [col] of selfRefs) {
          const oldFk = original[col];
          if (oldFk) {
            const mapped = idMap[t.name].get(oldFk);
            if (mapped && payload[col] !== mapped) {
              await supabase.from(t.name as any).update({ [col]: mapped }).eq("id", payload.id);
            }
          }
        }
      }
    }
  }

  const us = file.data.user_settings;
  if (us && typeof us === "object") {
    const { id, ...rest } = us as any;
    await supabase
      .from("user_settings")
      .upsert({ ...rest, user_id: userId }, { onConflict: "user_id" });
  }

  return { inserted, skipped };
}
