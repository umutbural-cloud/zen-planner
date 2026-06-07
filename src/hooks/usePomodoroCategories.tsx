import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCategoryName } from "@/lib/normalizeCategoryName";

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

const isDuplicateLikeError = (error: { code?: string; message?: string } | null) =>
  error?.code === "23505" || /duplicate|unique/i.test(error?.message || "");

export const usePomodoroCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PomodoroCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return []; }

    const { data, error } = await supabase
      .from("pomodoro_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (error) {
      setCategories([]);
      setLoading(false);
      toast.error("Pomodoro kategorileri yüklenemedi.");
      return [];
    }

    let cats = (data || []) as PomodoroCategoryRow[];
    const existingNames = new Set(cats.map((category) => normalizeCategoryName(category.name)));
    const missingDefaults = DEFAULTS.filter((category) => !existingNames.has(normalizeCategoryName(category.name)));

    if (missingDefaults.length > 0) {
      const nextPosition = cats.reduce((max, category) => Math.max(max, category.position), -1) + 1;
      const inserts: PomodoroCategoryInsert[] = missingDefaults.map((category, index) => ({
        ...category,
        user_id: user.id,
        position: nextPosition + index,
      }));
      const { error: insertError } = await supabase.from("pomodoro_categories").insert(inserts);

      if (insertError) {
        const { data: refetched, error: refetchError } = await supabase
          .from("pomodoro_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("position", { ascending: true });

        if (!refetchError) {
          cats = (refetched || []) as PomodoroCategoryRow[];
          const allDefaultsPresent = DEFAULTS.every((category) =>
            cats.some((existing) => normalizeCategoryName(existing.name) === normalizeCategoryName(category.name)));
          if (allDefaultsPresent && isDuplicateLikeError(insertError)) {
            setCategories(cats);
            setLoading(false);
            return cats;
          }
        }

        setCategories(cats);
        setLoading(false);
        toast.error("Pomodoro kategorileri yüklenemedi.");
        return cats;
      }

      const { data: refetched, error: refetchError } = await supabase
        .from("pomodoro_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (refetchError) {
        setCategories(cats);
        setLoading(false);
        toast.error("Pomodoro kategorileri yüklenemedi.");
        return cats;
      }

      cats = (refetched || []) as PomodoroCategoryRow[];
    }

    setCategories(cats);
    setLoading(false);
    return cats;
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, color = "gray") => {
    if (!user || !name.trim()) return;
    const trimmedName = name.trim();
    const normalizedName = normalizeCategoryName(trimmedName);
    if (categories.some((category) => normalizeCategoryName(category.name) === normalizedName)) {
      toast.error("Bu kategori zaten var.");
      return;
    }
    const payload: PomodoroCategoryInsert = {
      user_id: user.id, name: trimmedName, color, position: categories.length,
    };
    const { data, error } = await supabase.from("pomodoro_categories").insert(payload).select().single();
    if (error) {
      const reloaded = await load();
      if (isDuplicateLikeError(error) && reloaded.some((category) => normalizeCategoryName(category.name) === normalizedName)) {
        toast.error("Bu kategori zaten var.");
        return;
      }
      toast.error("Kategori eklenemedi.");
      return;
    }
    setCategories((arr) => [...arr, data]);
  };

  const update = async (id: string, patch: Partial<Pick<PomodoroCategory, "name" | "color">>) => {
    if (!user) return;
    const normalizedName = typeof patch.name === "string" ? normalizeCategoryName(patch.name) : null;
    if (
      normalizedName &&
      categories.some((category) => category.id !== id && normalizeCategoryName(category.name) === normalizedName)
    ) {
      toast.error("Bu kategori zaten var.");
      return;
    }

    const nextPatch = {
      ...patch,
      ...(typeof patch.name === "string" ? { name: patch.name.trim() } : {}),
    };
    setCategories((arr) => arr.map((c) => (c.id === id ? { ...c, ...nextPatch } : c)));
    const payload: PomodoroCategoryUpdate = nextPatch;
    const { error } = await supabase.from("pomodoro_categories").update(payload).eq("id", id).eq("user_id", user.id);
    if (error) {
      await load();
      toast.error("Kategori güncellenemedi.");
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    setCategories((arr) => arr.filter((c) => c.id !== id));
    await supabase.from("pomodoro_categories").delete().eq("id", id).eq("user_id", user.id);
  };

  return { categories, loading, create, update, remove, reload: load };
};
