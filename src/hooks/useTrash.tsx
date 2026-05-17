import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type TrashItem = {
  id: string;
  kind: "task" | "note" | "project" | "journal" | "backlog";
  title: string;
  deleted_at: string;
};

const tableFor = (kind: TrashItem["kind"]) => ({
  task: "tasks",
  note: "notes",
  project: "projects",
  journal: "journal_entries",
  backlog: "backlog_tasks",
}[kind]);

export const useTrash = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [tasks, notes, projects, journals, backlog] = await Promise.all([
      supabase.from("tasks").select("id, title, deleted_at").not("deleted_at", "is", null),
      supabase.from("notes").select("id, title, deleted_at").not("deleted_at", "is", null),
      supabase.from("projects").select("id, name, deleted_at").not("deleted_at", "is", null),
      supabase.from("journal_entries").select("id, entry_date, deleted_at").not("deleted_at", "is", null),
      supabase.from("backlog_tasks").select("id, title, deleted_at").not("deleted_at", "is", null),
    ]);
    const all: TrashItem[] = [
      ...((tasks.data || []) as any[]).map((t) => ({ id: t.id, kind: "task" as const, title: t.title || "(başlıksız)", deleted_at: t.deleted_at })),
      ...((notes.data || []) as any[]).map((n) => ({ id: n.id, kind: "note" as const, title: n.title || "(başlıksız not)", deleted_at: n.deleted_at })),
      ...((projects.data || []) as any[]).map((p) => ({ id: p.id, kind: "project" as const, title: p.name || "(proje)", deleted_at: p.deleted_at })),
      ...((journals.data || []) as any[]).map((j) => ({ id: j.id, kind: "journal" as const, title: `Günlük: ${j.entry_date}`, deleted_at: j.deleted_at })),
      ...((backlog.data || []) as any[]).map((b) => ({ id: b.id, kind: "backlog" as const, title: b.title, deleted_at: b.deleted_at })),
    ].sort((a, b) => (b.deleted_at > a.deleted_at ? 1 : -1));
    setItems(all);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const restore = async (item: TrashItem) => {
    await supabase.from(tableFor(item.kind) as any).update({ deleted_at: null }).eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const purge = async (item: TrashItem) => {
    await supabase.from(tableFor(item.kind) as any).delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const purgeAll = async () => {
    await Promise.all(items.map((i) => supabase.from(tableFor(i.kind) as any).delete().eq("id", i.id)));
    setItems([]);
  };

  return { items, loading, restore, purge, purgeAll, refetch: fetchAll };
};
