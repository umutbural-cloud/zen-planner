// Whitelist of user-owned, portable tables and their foreign-key shape.
// Auth, sessions, push_subscriptions, reminders (device-bound) are NOT exported.

export const APP_NAME = "Keikaku";
export const SCHEMA_VERSION = 1;

export type TableName =
  | "projects"
  | "habit_categories"
  | "pomodoro_categories"
  | "notebooks"
  | "notebook_notes"
  | "notes"
  | "tasks"
  | "habits"
  | "habit_completions"
  | "pomodoro_sessions"
  | "backlog_tasks"
  | "journal_entries"
  | "quick_notes";

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
  { name: "notebooks", fk: { parent_id: "notebooks" } },
  { name: "notebook_notes", fk: { notebook_id: "notebooks", parent_note_id: "notebook_notes" } },
  { name: "notes", fk: { project_id: "projects" } },
  { name: "tasks", fk: { project_id: "projects", parent_block_id: "tasks", category_id: "pomodoro_categories" } },
  { name: "habits", fk: { project_id: "projects", category_id: "habit_categories" } },
  { name: "habit_completions", fk: { habit_id: "habits" } },
  { name: "pomodoro_sessions", fk: { task_id: "tasks", category_id: "pomodoro_categories" } },
  { name: "backlog_tasks", fk: {} },
  { name: "journal_entries", fk: {} },
  { name: "quick_notes", fk: {} },
];

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
  return true;
}

export type ImportSummary = {
  projects: number;
  tasks: number;
  notes: number;
  habits: number;
  pomodoro_sessions: number;
  notebooks: number;
  quick_notes: number;
  journal_entries: number;
  total: number;
};

export function summarize(file: ExportFile): ImportSummary {
  const d = file.data;
  const len = (k: TableName) => (Array.isArray(d[k]) ? d[k]!.length : 0);
  const total = TABLES.reduce((acc, t) => acc + len(t.name), 0);
  return {
    projects: len("projects"),
    tasks: len("tasks"),
    notes: len("notes") + len("notebook_notes"),
    habits: len("habits"),
    pomodoro_sessions: len("pomodoro_sessions"),
    notebooks: len("notebooks"),
    quick_notes: len("quick_notes"),
    journal_entries: len("journal_entries"),
    total,
  };
}
