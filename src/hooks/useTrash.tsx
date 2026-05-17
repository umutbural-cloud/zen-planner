import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type TrashItem = {
  id: string;
  kind: "task" | "note" | "project" | "journal" | "backlog";
  title: string;
  deleted_at: string;
};

export const useTrash = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
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
      ...(tasks.data || []).flatMap((t) => t.deleted_at ? [{ id: t.id, kind: "task" as const, title: t.title || "(başlıksız)", deleted_at: t.deleted_at }] : []),
      ...(notes.data || []).flatMap((n) => n.deleted_at ? [{ id: n.id, kind: "note" as const, title: n.title || "(başlıksız not)", deleted_at: n.deleted_at }] : []),
      ...(projects.data || []).flatMap((p) => p.deleted_at ? [{ id: p.id, kind: "project" as const, title: p.name || "(proje)", deleted_at: p.deleted_at }] : []),
      ...(journals.data || []).flatMap((j) => j.deleted_at ? [{ id: j.id, kind: "journal" as const, title: `Günlük: ${j.entry_date}`, deleted_at: j.deleted_at }] : []),
      ...(backlog.data || []).flatMap((b) => b.deleted_at ? [{ id: b.id, kind: "backlog" as const, title: b.title, deleted_at: b.deleted_at }] : []),
    ].sort((a, b) => (b.deleted_at > a.deleted_at ? 1 : -1));
    setItems(all);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const restoreItem = async (item: TrashItem) => {
    if (item.kind === "task") return supabase.from("tasks").update({ deleted_at: null }).eq("id", item.id);
    if (item.kind === "note") return supabase.from("notes").update({ deleted_at: null }).eq("id", item.id);
    if (item.kind === "project") return supabase.from("projects").update({ deleted_at: null }).eq("id", item.id);
    if (item.kind === "journal") return supabase.from("journal_entries").update({ deleted_at: null }).eq("id", item.id);
    return supabase.from("backlog_tasks").update({ deleted_at: null }).eq("id", item.id);
  };

  const purgeItem = async (item: TrashItem) => {
    if (item.kind === "task") return supabase.from("tasks").delete().eq("id", item.id);
    if (item.kind === "note") return supabase.from("notes").delete().eq("id", item.id);
    if (item.kind === "project") return supabase.from("projects").delete().eq("id", item.id);
    if (item.kind === "journal") return supabase.from("journal_entries").delete().eq("id", item.id);
    return supabase.from("backlog_tasks").delete().eq("id", item.id);
  };

  const restore = async (item: TrashItem) => {
    await restoreItem(item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const purge = async (item: TrashItem) => {
    await purgeItem(item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const purgeAll = async () => {
    await Promise.all(items.map(purgeItem));
    setItems([]);
  };

  return { items, loading, restore, purge, purgeAll, refetch: fetchAll };
};
