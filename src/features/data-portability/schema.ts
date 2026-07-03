// Whitelist of user-owned, portable tables and their foreign-key shape.
// Knowledge center tables are intentionally excluded from this transfer set.
// Auth, sessions, push_subscriptions, reminders (device-bound) are NOT exported.

export const APP_NAME = "Keikaku";
export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_TOTAL_ROWS = 10000;
export const MAX_IMPORT_ROWS_PER_TABLE = 3000;

export type TableName =
  | "projects"
  | "habit_categories"
  | "pomodoro_categories"
  | "notes"
  | "tasks"
  | "habits"
  | "habit_completions"
  | "pomodoro_sessions"
  | "backlog_tasks"
  | "journal_entries";

export type TableSpec = {
  name: TableName;
  // foreign key columns mapping to source table for id remapping
  fk: Partial<Record<string, TableName>>;
};

export type PortableRow = Record<string, unknown>;

// Order matters: parents before children.
export const TABLES: TableSpec[] = [
  { name: "projects", fk: { parent_id: "projects" } },
  { name: "habit_categories", fk: {} },
  { name: "pomodoro_categories", fk: {} },
  { name: "notes", fk: { project_id: "projects" } },
  { name: "tasks", fk: { project_id: "projects", parent_block_id: "tasks", deleted_by_parent_id: "tasks", category_id: "pomodoro_categories" } },
  { name: "habits", fk: { project_id: "projects", category_id: "habit_categories" } },
  { name: "habit_completions", fk: { habit_id: "habits" } },
  { name: "pomodoro_sessions", fk: { task_id: "tasks", category_id: "pomodoro_categories" } },
  { name: "backlog_tasks", fk: {} },
  { name: "journal_entries", fk: {} },
];
const TABLE_NAMES = new Set<TableName>(TABLES.map((table) => table.name));

// Per-table column blacklist (sensitive / server-managed identifiers we won't export).
export const ALWAYS_STRIP = ["user_id"] as const;

export type ExportFile = {
  app_name: string;
  schema_version: number;
  exported_at: string;
  export_id: string;
  user_data_only: true;
  data: Partial<Record<TableName, PortableRow[]>> & { user_settings?: PortableRow | null };
  counts: Record<string, number>;
};

export function isExportFile(x: unknown): x is ExportFile {
  if (!x || typeof x !== "object") return false;
  const candidate = x as Record<string, unknown>;
  if (candidate.app_name !== APP_NAME) return false;
  if (typeof candidate.schema_version !== "number") return false;
  if (typeof candidate.export_id !== "string" || candidate.export_id.length < 8) return false;
  if (typeof candidate.exported_at !== "string") return false;
  if (candidate.user_data_only !== true) return false;
  if (!candidate.data || typeof candidate.data !== "object") return false;
  if (!isValidImportData(candidate.data)) return false;
  return true;
}

export function isValidImportData(data: unknown): data is ExportFile["data"] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;

  let totalRows = 0;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "user_settings") {
      if (value !== null && (typeof value !== "object" || Array.isArray(value))) return false;
      continue;
    }
    if (!TABLE_NAMES.has(key as TableName) || !Array.isArray(value)) return false;
    if (value.length > MAX_IMPORT_ROWS_PER_TABLE) return false;
    totalRows += value.length;
    if (totalRows > MAX_IMPORT_TOTAL_ROWS) return false;
  }

  return true;
}

export function validateImportDataLimits(file: ExportFile) {
  if (!isValidImportData(file.data)) {
    throw new Error("Bu yedek dosyası desteklenmeyen tablo veya veri şekli içeriyor");
  }
}

export type ImportSummary = {
  projects: number;
  tasks: number;
  notes: number;
  habits: number;
  pomodoro_sessions: number;
  journal_entries: number;
  backlog_tasks: number;
  total: number;
};

export function summarize(file: ExportFile): ImportSummary {
  const d = file.data;
  const len = (k: TableName) => (Array.isArray(d[k]) ? d[k]!.length : 0);
  const total = TABLES.reduce((acc, t) => acc + len(t.name), 0);
  return {
    projects: len("projects"),
    tasks: len("tasks"),
    notes: len("notes"),
    habits: len("habits"),
    pomodoro_sessions: len("pomodoro_sessions"),
    journal_entries: len("journal_entries"),
    backlog_tasks: len("backlog_tasks"),
    total,
  };
}
