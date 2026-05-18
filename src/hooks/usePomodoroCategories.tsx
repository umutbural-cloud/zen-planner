import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PomodoroCategoryRow = Database["public"]["Tables"]["pomodoro_categories"]["Row"];
type PomodoroCategoryInsert = Database["public"]["Tables"]["pomodoro_categories"]["Insert"];
type PomodoroCategoryUpdate = Database["public"]["Tables"]["pomodoro_categories"]["Update"];

export type PomodoroCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
};

const DEFAULTS: Array<{ name: string; color: string }> = [
  { name: "İş", color: "blue" },
  { name: "Hayat", color: "green" },
  { name: "Dinlenme", color: "yellow" },
];

export const usePomodoroCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PomodoroCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return; }
    const { data } = await supabase
      .from("pomodoro_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    let cats = (data || []) as PomodoroCategoryRow[];
    if (cats.length === 0) {
      const inserts: PomodoroCategoryInsert[] = DEFAULTS.map((d, i) => ({ ...d, user_id: user.id, position: i }));
      const { data: created } = await supabase.from("pomodoro_categories").insert(inserts).select();
      cats = created || [];
    }
    setCategories(cats);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, color = "gray") => {
    if (!user) return;
    const payload: PomodoroCategoryInsert = {
      user_id: user.id, name, color, position: categories.length,
    };
    const { data, error } = await supabase.from("pomodoro_categories").insert(payload).select().single();
    if (error) { toast.error("Kategori eklenemedi."); return; }
    setCategories((arr) => [...arr, data]);
  };

  const update = async (id: string, patch: Partial<Pick<PomodoroCategory, "name" | "color">>) => {
    if (!user) return;
    setCategories((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const payload: PomodoroCategoryUpdate = patch;
    await supabase.from("pomodoro_categories").update(payload).eq("id", id).eq("user_id", user.id);
  };

  const remove = async (id: string) => {
    if (!user) return;
    setCategories((arr) => arr.filter((c) => c.id !== id));
    await supabase.from("pomodoro_categories").delete().eq("id", id).eq("user_id", user.id);
  };

  return { categories, loading, create, update, remove, reload: load };
};
