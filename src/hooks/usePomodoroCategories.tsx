import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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
      .from("pomodoro_categories" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    let cats = (data as any as PomodoroCategory[]) || [];
    if (cats.length === 0) {
      const inserts = DEFAULTS.map((d, i) => ({ ...d, user_id: user.id, position: i }));
      const { data: created } = await supabase.from("pomodoro_categories" as any).insert(inserts).select();
      cats = (created as any as PomodoroCategory[]) || [];
    }
    setCategories(cats);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, color = "gray") => {
    if (!user) return;
    const { data, error } = await supabase.from("pomodoro_categories" as any).insert({
      user_id: user.id, name, color, position: categories.length,
    }).select().single();
    if (error) { toast.error("Kategori eklenemedi."); return; }
    setCategories((arr) => [...arr, data as any]);
  };

  const update = async (id: string, patch: Partial<Pick<PomodoroCategory, "name" | "color">>) => {
    setCategories((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from("pomodoro_categories" as any).update(patch).eq("id", id);
  };

  const remove = async (id: string) => {
    setCategories((arr) => arr.filter((c) => c.id !== id));
    await supabase.from("pomodoro_categories" as any).delete().eq("id", id);
  };

  return { categories, loading, create, update, remove, reload: load };
};
