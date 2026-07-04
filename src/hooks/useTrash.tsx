import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type TrashItem = {
  id: string;
  kind: "task" | "note" | "quick_note" | "project" | "journal" | "backlog" | "pomodoro_session";
  title: string;
  deleted_at: string;
  parent_block_id?: string | null;
};

type MutationResult = {
  ok: boolean;
  pomodoroChanged?: boolean;
};

export const useTrash = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tasks, notes, quickNotes, projects, journals, backlog, pomodoroSessions] = await Promise.all([
      supabase.from("tasks").select("id, title, deleted_at, parent_block_id").eq("user_id", user.id).not("deleted_at", "is", null).is("deleted_by_parent_id", null),
      supabase.from("notes").select("id, title, deleted_at").eq("user_id", user.id).not("deleted_at", "is", null),
      supabase.from("notebook_notes").select("id, title, deleted_at").eq("user_id", user.id).eq("type", "quick").not("deleted_at", "is", null),
      supabase.from("projects").select("id, name, deleted_at").eq("user_id", user.id).not("deleted_at", "is", null),
      supabase.from("journal_entries").select("id, entry_date, deleted_at").eq("user_id", user.id).not("deleted_at", "is", null),
      supabase.from("backlog_tasks").select("id, title, deleted_at").eq("user_id", user.id).not("deleted_at", "is", null),
      supabase.from("pomodoro_sessions").select("id, note, started_at, duration_seconds, deleted_at").eq("user_id", user.id).not("deleted_at", "is", null),
    ]);
    const all: TrashItem[] = [
      ...(tasks.data || []).flatMap((t) => t.deleted_at ? [{ id: t.id, kind: "task" as const, title: t.title || "(başlıksız)", deleted_at: t.deleted_at, parent_block_id: t.parent_block_id }] : []),
      ...(notes.data || []).flatMap((n) => n.deleted_at ? [{ id: n.id, kind: "note" as const, title: n.title || "(başlıksız not)", deleted_at: n.deleted_at }] : []),
      ...(quickNotes.data || []).flatMap((n) => n.deleted_at ? [{ id: n.id, kind: "quick_note" as const, title: n.title || "(anlık not)", deleted_at: n.deleted_at }] : []),
      ...(projects.data || []).flatMap((p) => p.deleted_at ? [{ id: p.id, kind: "project" as const, title: p.name || "(proje)", deleted_at: p.deleted_at }] : []),
      ...(journals.data || []).flatMap((j) => j.deleted_at ? [{ id: j.id, kind: "journal" as const, title: `Günlük: ${j.entry_date}`, deleted_at: j.deleted_at }] : []),
      ...(backlog.data || []).flatMap((b) => b.deleted_at ? [{ id: b.id, kind: "backlog" as const, title: b.title, deleted_at: b.deleted_at }] : []),
      ...(pomodoroSessions.data || []).flatMap((s) =>
        s.deleted_at
          ? [{ id: s.id, kind: "pomodoro_session" as const, title: s.note?.trim() || "Pomodoro kaydı", deleted_at: s.deleted_at }]
          : []
      ),
    ].sort((a, b) => (b.deleted_at > a.deleted_at ? 1 : -1));
    setItems(all);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const restoreItem = async (item: TrashItem) => {
    if (!user) return { ok: false };

    const applyResult = ({ data, error }: { data: { id: string } | null; error: { message: string } | null }): MutationResult => {
      if (error) {
        toast.error("Geri yüklenemedi.");
        return { ok: false };
      }
      if (!data) {
        toast.error("Öğe bulunamadı veya zaten geri yüklenmiş.");
        return { ok: false };
      }
      return { ok: true, pomodoroChanged: item.kind === "pomodoro_session" };
    };

    if (item.kind === "task") {
      const restored = await supabase
        .from("tasks")
        .update({ deleted_at: null, deleted_by_parent_id: null })
        .eq("id", item.id)
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .select("id")
        .maybeSingle();
      const result = applyResult(restored);
      if (!result.ok || item.parent_block_id) return result;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null, deleted_by_parent_id: null })
        .eq("user_id", user.id)
        .eq("deleted_by_parent_id", item.id);
      if (error) {
        await supabase
          .from("tasks")
          .update({ deleted_at: item.deleted_at, deleted_by_parent_id: null })
          .eq("id", item.id)
          .eq("user_id", user.id);
        toast.error("Alt görevler geri yüklenemedi.");
        return { ok: false };
      }
      return result;
    }
    if (item.kind === "note") return applyResult(await supabase.from("notes").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "quick_note") return applyResult(await supabase.from("notebook_notes").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "project") return applyResult(await supabase.from("projects").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "journal") return applyResult(await supabase.from("journal_entries").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "pomodoro_session") return applyResult(await supabase.from("pomodoro_sessions").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    return applyResult(await supabase.from("backlog_tasks").update({ deleted_at: null }).eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
  };

  const purgeItem = async (item: TrashItem) => {
    if (!user) return { ok: false };

    const applyResult = ({ data, error }: { data: { id: string } | null; error: { message: string } | null }): MutationResult => {
      if (error) {
        toast.error("Kalıcı olarak silinemedi.");
        return { ok: false };
      }
      if (!data) {
        toast.error("Öğe bulunamadı veya artık çöp kutusunda değil.");
        return { ok: false };
      }
      return { ok: true, pomodoroChanged: item.kind === "pomodoro_session" };
    };

    if (item.kind === "task") {
      if (!item.parent_block_id) {
        const { error: detachError } = await supabase
          .from("tasks")
          .update({ parent_block_id: null })
          .eq("user_id", user.id)
          .eq("parent_block_id", item.id)
          .is("deleted_by_parent_id", null);
        if (detachError) {
          toast.error("Alt görev bağlantıları koparılamadı.");
          return { ok: false };
        }
      }
      return applyResult(await supabase.from("tasks").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    }
    if (item.kind === "note") return applyResult(await supabase.from("notes").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "quick_note") return applyResult(await supabase.from("notebook_notes").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "project") return applyResult(await supabase.from("projects").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "journal") return applyResult(await supabase.from("journal_entries").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    if (item.kind === "pomodoro_session") return applyResult(await supabase.from("pomodoro_sessions").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
    return applyResult(await supabase.from("backlog_tasks").delete().eq("id", item.id).eq("user_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle());
  };

  const restore = async (item: TrashItem) => {
    if (!user) return;
    const result = await restoreItem(item);
    if (!result.ok) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (result.pomodoroChanged) window.dispatchEvent(new Event("pomodoro:session-saved"));
  };

  const purge = async (item: TrashItem) => {
    if (!user) return;
    const result = await purgeItem(item);
    if (!result.ok) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (result.pomodoroChanged) window.dispatchEvent(new Event("pomodoro:session-saved"));
  };

  const purgeAll = async () => {
    if (!user) return;
    const results = await Promise.all(items.map(purgeItem));
    const removedIds = new Set(items.filter((_, index) => results[index].ok).map((item) => `${item.kind}-${item.id}`));
    const pomodoroChanged = results.some((result) => result.ok && result.pomodoroChanged);
    setItems((prev) => prev.filter((item) => !removedIds.has(`${item.kind}-${item.id}`)));
    if (pomodoroChanged) window.dispatchEvent(new Event("pomodoro:session-saved"));
  };

  return { items, loading, restore, purge, purgeAll, refetch: fetchAll };
};
