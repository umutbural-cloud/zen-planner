/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { TABLES, type ExportFile } from "./schema";
import { z } from "zod";

export type ImportProgress = {
  table: string;
  done: number;
  total: number;
};

const MAX_ROWS_PER_TABLE = 10000;
const MAX_TOTAL_ROWS = 100000;

const TABLE_COLUMNS: Record<string, Set<string>> = {
  projects: new Set([
    "id", "created_at", "deleted_at", "emoji", "enabled_views", "icon", "icon_color",
    "kind", "name", "parent_id", "stable_export_id", "user_id",
  ]),
  habit_categories: new Set([
    "id", "color", "created_at", "name", "position", "stable_export_id", "updated_at", "user_id",
  ]),
  pomodoro_categories: new Set([
    "id", "color", "created_at", "name", "position", "stable_export_id", "updated_at", "user_id",
  ]),
  notes: new Set([
    "id", "content", "created_at", "deleted_at", "project_id", "stable_export_id", "title", "updated_at", "user_id",
  ]),
  tasks: new Set([
    "id", "category_id", "color", "completed_at", "created_at", "deleted_at", "description",
    "end_date", "end_time", "hidden", "kind", "parent_block_id", "position", "project_id",
    "reminder_minutes_before", "stable_export_id", "start_date", "start_time", "status", "title", "user_id",
  ]),
  habits: new Set([
    "id", "category_id", "created_at", "deleted_at", "description", "frequency_days",
    "frequency_type", "hidden", "icon", "position", "project_id", "stable_export_id",
    "time_of_day", "title", "user_id",
  ]),
  habit_completions: new Set([
    "id", "completed_at", "completion_date", "habit_id", "stable_export_id", "user_id",
  ]),
  pomodoro_sessions: new Set([
    "id", "category_id", "created_at", "duration_seconds", "ended_at", "kind", "note",
    "stable_export_id", "started_at", "task_id", "updated_at", "user_id",
  ]),
  backlog_tasks: new Set([
    "id", "color", "created_at", "deleted_at", "description", "due_date", "position",
    "priority", "stable_export_id", "title", "updated_at", "urgency", "user_id",
  ]),
  journal_entries: new Set([
    "id", "content", "created_at", "deleted_at", "entry_date", "stable_export_id", "updated_at", "user_id",
  ]),
};

const USER_SETTINGS_COLUMNS = new Set([
  "auto_prayer_times", "calculation_method", "city", "country", "default_pomodoro_project_id",
  "latitude", "location_permission", "longitude", "module_labels", "notify_habits",
  "notify_pomodoro", "notify_tasks", "quiet_hours_end", "quiet_hours_start", "startup_page",
  "timezone", "ui_scale", "user_id",
]);

const isImportedDefaultProject = (row: Record<string, unknown>) =>
  row.deleted_at == null && (row.is_default === true || row.name === "Yapılacaklar Listesi");

const naturalKeyFor = (table: string, row: Record<string, unknown>) => {
  if (
    table === "projects" &&
    isImportedDefaultProject(row)
  ) {
    return "default_project";
  }
  if ((table === "habit_categories" || table === "pomodoro_categories") && typeof row.name === "string") {
    return `name:${row.name}`;
  }
  if (table === "journal_entries" && typeof row.entry_date === "string") {
    return `entry_date:${row.entry_date}`;
  }
  return null;
};

const rowSchema = z.record(z.string(), z.unknown()).superRefine((row, ctx) => {
  if ("id" in row && typeof row.id !== "string") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "id must be a string" });
  }
  if ("stable_export_id" in row && typeof row.stable_export_id !== "string") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "stable_export_id must be a string" });
  }
});

const pickAllowed = (row: Record<string, unknown>, allowed: Set<string>) => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) cleaned[key] = value;
  }
  return cleaned;
};

const isStartupPage = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "default") return true;
  if (candidate.type === "project") return typeof candidate.value === "string";
  if (candidate.type === "module") {
    return candidate.value === "backlog" ||
      candidate.value === "journal" ||
      candidate.value === "habits" ||
      candidate.value === "workHistory" ||
      candidate.value === "pomodoro";
  }
  return false;
};

const remapForeignKeys = (
  fk: Partial<Record<string, string>>,
  row: Record<string, unknown>,
  idMap: Record<string, Map<string, string>>,
) => {
  const updates: Record<string, string | null> = {};
  for (const [col, refTable] of Object.entries(fk)) {
    if (refTable === "tasks" && col === "parent_block_id") continue;
    const oldFk = row[col];
    if (!oldFk || typeof oldFk !== "string") continue;
    const mapped = idMap[refTable]?.get(oldFk);
    updates[col] = mapped ?? null;
  }
  return updates;
};

const validateImportPayload = (file: ExportFile) => {
  let total = 0;
  for (const t of TABLES) {
    const rows = (file.data[t.name] as unknown[]) || [];
    if (rows.length > MAX_ROWS_PER_TABLE) {
      throw new Error(`${t.name}: row limit exceeded`);
    }
    rows.forEach((row, idx) => {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        throw new Error(`${t.name}[${idx}]: invalid row payload`);
      }
    });
    total += rows.length;
  }
  if (total > MAX_TOTAL_ROWS) {
    throw new Error("Import payload too large");
  }
};

// Dynamic Supabase table access is intentionally isolated in this import boundary.
// The caller receives a typed ExportFile, while table-specific payloads are validated by
// the whitelist in schema.ts and by database constraints during insert/update.
export async function importUserData(
  userId: string,
  file: ExportFile,
  onProgress?: (p: ImportProgress) => void,
): Promise<{ inserted: number; skipped: number }> {
  validateImportPayload(file);

  const idMap: Record<string, Map<string, string>> = {};
  let inserted = 0;
  let skipped = 0;
  let defaultPomodoroProjectId: string | null = null;

  for (const t of TABLES) {
    const rows = (file.data[t.name] as any[]) || [];
    idMap[t.name] = new Map();
    if (rows.length === 0) {
      onProgress?.({ table: t.name, done: 0, total: 0 });
      continue;
    }

    const stableIds = rows.map((r) => r.stable_export_id).filter(Boolean);
    const existing = new Map<string, string>();
    const existingNatural = new Map<string, string>();
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
    if (t.name === "projects") {
      const { data: ex } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .eq("is_default", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (ex) existingNatural.set("default_project", ex.id);
    }
    if (t.name === "habit_categories" || t.name === "pomodoro_categories") {
      const names = rows.map((r) => r.name).filter((name): name is string => typeof name === "string");
      for (let i = 0; i < names.length; i += 500) {
        const chunk = names.slice(i, i + 500);
        const { data: ex } = await supabase
          .from(t.name as any)
          .select("id, name")
          .eq("user_id", userId)
          .in("name", chunk);
        (ex || []).forEach((row: any) => existingNatural.set(`name:${row.name}`, row.id));
      }
    }
    if (t.name === "journal_entries") {
      const dates = rows.map((r) => r.entry_date).filter((date): date is string => typeof date === "string");
      for (let i = 0; i < dates.length; i += 500) {
        const chunk = dates.slice(i, i + 500);
        const { data: ex } = await supabase
          .from("journal_entries")
          .select("id, entry_date")
          .eq("user_id", userId)
          .in("entry_date", chunk);
        (ex || []).forEach((row: any) => existingNatural.set(`entry_date:${row.entry_date}`, row.id));
      }
    }

    const payloads: any[] = [];
    for (const row of rows) {
      const existsId = row.stable_export_id ? existing.get(row.stable_export_id) : undefined;
      const naturalKey = naturalKeyFor(t.name, row);
      const naturalExistsId = naturalKey ? existingNatural.get(naturalKey) : undefined;
      if (t.name === "projects" && naturalExistsId && existsId && naturalExistsId !== existsId) {
        await supabase
          .from("projects")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", existsId)
          .eq("user_id", userId);
      }
      const targetExistingId = t.name === "projects" && naturalExistsId ? naturalExistsId : existsId ?? naturalExistsId;

      if (targetExistingId && row.id) {
        idMap[t.name].set(row.id, targetExistingId);
        const refUpdates = remapForeignKeys(t.fk, row, idMap);
        if (Object.keys(refUpdates).length) {
          await supabase
            .from(t.name as any)
            .update(refUpdates)
            .eq("id", targetExistingId)
            .eq("user_id", userId);
        }
        if (t.name === "journal_entries" && typeof row.content === "string" && row.content.length > 0) {
          await supabase
            .from("journal_entries")
            .update({ content: row.content, deleted_at: row.deleted_at ?? null })
            .eq("id", targetExistingId)
            .eq("user_id", userId);
        }
        if (
          t.name === "projects" &&
          !defaultPomodoroProjectId &&
          (isImportedDefaultProject(row) || !rows.some((candidate) => candidate.deleted_at == null && candidate.is_default === true))
        ) {
          defaultPomodoroProjectId = targetExistingId;
        }
        skipped++;
        continue;
      }

      const newRow: any = pickAllowed(row, TABLE_COLUMNS[t.name]);
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

      if (oldId) idMap[t.name].set(oldId, newId);
      if (
        t.name === "projects" &&
        !defaultPomodoroProjectId &&
        row.deleted_at == null &&
        (row.is_default === true || !rows.some((candidate) => candidate.deleted_at == null && candidate.is_default === true))
      ) {
        defaultPomodoroProjectId = newId;
      }
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
    const rest = pickAllowed(us as Record<string, unknown>, USER_SETTINGS_COLUMNS);
    const oldDefaultPomodoroProjectId = rest.default_pomodoro_project_id;
    if (typeof oldDefaultPomodoroProjectId === "string") {
      rest.default_pomodoro_project_id = idMap.projects?.get(oldDefaultPomodoroProjectId) ?? null;
    } else {
      rest.default_pomodoro_project_id = defaultPomodoroProjectId;
    }

    if (isStartupPage(rest.startup_page) && rest.startup_page.type === "project") {
      const mappedProjectId = idMap.projects?.get(rest.startup_page.value as string);
      rest.startup_page = mappedProjectId ? { type: "project", value: mappedProjectId } : { type: "default" };
    } else if (!isStartupPage(rest.startup_page)) {
      rest.startup_page = { type: "default" };
    }

    await supabase
      .from("user_settings")
      .upsert({ ...rest, user_id: userId }, { onConflict: "user_id" });
  }

  return { inserted, skipped };
}
