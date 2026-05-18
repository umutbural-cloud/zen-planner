import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type HabitCategoryRow = Database["public"]["Tables"]["habit_categories"]["Row"];
type HabitCategoryInsert = Database["public"]["Tables"]["habit_categories"]["Insert"];
type HabitCategoryUpdate = Database["public"]["Tables"]["habit_categories"]["Update"];

export type HabitCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
};

export const CATEGORY_COLORS: { key: string; hex: string; label: string }[] = [
  { key: "black", hex: "#111827", label: "Siyah" },
  { key: "gray", hex: "#9ca3af", label: "Gri" },
  { key: "stone", hex: "#a8a29e", label: "Taş" },
  { key: "slate", hex: "#64748b", label: "Çelik" },
  { key: "red", hex: "#ef4444", label: "Kırmızı" },
  { key: "rose", hex: "#fb7185", label: "Gül" },
  { key: "pink", hex: "#ec4899", label: "Pembe" },
  { key: "fuchsia", hex: "#d946ef", label: "Fuşya" },
  { key: "violet", hex: "#8b5cf6", label: "Mor" },
  { key: "indigo", hex: "#6366f1", label: "İndigo" },
  { key: "blue", hex: "#3b82f6", label: "Mavi" },
  { key: "sky", hex: "#0ea5e9", label: "Gök" },
  { key: "cyan", hex: "#06b6d4", label: "Camgöbeği" },
  { key: "teal", hex: "#14b8a6", label: "Çamur" },
  { key: "emerald", hex: "#10b981", label: "Zümrüt" },
  { key: "green", hex: "#22c55e", label: "Yeşil" },
  { key: "lime", hex: "#84cc16", label: "Misket" },
  { key: "yellow", hex: "#eab308", label: "Sarı" },
  { key: "amber", hex: "#f59e0b", label: "Kehribar" },
  { key: "orange", hex: "#f97316", label: "Turuncu" },
  // Pastel tones
  { key: "pastel-rose", hex: "#fecdd3", label: "Pastel Gül" },
  { key: "pastel-peach", hex: "#fed7aa", label: "Pastel Şeftali" },
  { key: "pastel-yellow", hex: "#fef08a", label: "Pastel Sarı" },
  { key: "pastel-mint", hex: "#bbf7d0", label: "Pastel Nane" },
  { key: "pastel-sky", hex: "#bae6fd", label: "Pastel Gök" },
  { key: "pastel-lavender", hex: "#ddd6fe", label: "Pastel Lavanta" },
  { key: "pastel-pink", hex: "#fbcfe8", label: "Pastel Pembe" },
  { key: "pastel-sand", hex: "#e7e5e4", label: "Pastel Kum" },
  { key: "pastel-lilac", hex: "#e9d5ff", label: "Pastel Leylak" },
  { key: "pastel-aqua", hex: "#a5f3fc", label: "Pastel Su" },
];

export const colorHex = (key?: string | null) =>
  CATEGORY_COLORS.find((c) => c.key === key)?.hex ?? "#9ca3af";

const DEFAULTS: { name: string; color: string }[] = [
  { name: "Sağlık", color: "emerald" },
  { name: "Gelişim", color: "violet" },
  { name: "Üretkenlik", color: "sky" },
  { name: "Rutin", color: "stone" },
];

export const useHabitCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return; }
    const { data } = await supabase
      .from("habit_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    let rows = (data || []) as HabitCategoryRow[];
    if (rows.length === 0) {
      const payload: HabitCategoryInsert[] = DEFAULTS.map((d, i) => ({ user_id: user.id, name: d.name, color: d.color, position: i }));
      await supabase.from("habit_categories").upsert(payload, { onConflict: "user_id,name", ignoreDuplicates: true });
      const { data: refetched } = await supabase
        .from("habit_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      rows = refetched || [];
    }
    setCategories(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const createCategory = async (name: string, color = "gray") => {
    if (!user || !name.trim()) return null;
    const pos = categories.reduce((m, c) => Math.max(m, c.position), 0) + 1;
    const { data } = await supabase.from("habit_categories")
      .insert({ user_id: user.id, name: name.trim(), color, position: pos })
      .select().single();
    if (data) setCategories((p) => [...p, data]);
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<HabitCategory>) => {
    if (!user) return;
    const payload: HabitCategoryUpdate = updates;
    const { data } = await supabase.from("habit_categories").update(payload).eq("id", id).eq("user_id", user.id).select().single();
    if (data) setCategories((p) => p.map((c) => c.id === id ? data : c));
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    await supabase.from("habit_categories").delete().eq("id", id).eq("user_id", user.id);
    setCategories((p) => p.filter((c) => c.id !== id));
  };

  return { categories, loading, createCategory, updateCategory, deleteCategory };
};
