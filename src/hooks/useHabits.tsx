import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, subDays } from "date-fns";
import type { TimeOfDay } from "@/lib/timeOfDay";

export type FrequencyType = "daily" | "weekdays" | "weekly" | "monthly";

export type Habit = {
  id: string;
  user_id: string;
  project_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  icon: string;
  frequency_type: FrequencyType;
  frequency_days: number[];
  time_of_day: TimeOfDay;
  position: number;
  hidden: boolean;
  created_at: string;
  completed_today: boolean;
};

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const useHabits = (projectId?: string | null) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(todayStr());
  // habit_id -> Set<yyyy-MM-dd>
  const [completionsMap, setCompletionsMap] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const i = setInterval(() => {
      const d = todayStr();
      if (d !== today) setToday(d);
    }, 30000);
    return () => clearInterval(i);
  }, [today]);

  const fetchHabits = useCallback(async () => {
    if (!user) { setHabits([]); setLoading(false); return; }
    let q = supabase.from("habits").select("*").eq("user_id", user.id).is("deleted_at", null).order("position", { ascending: true });
    if (projectId) q = q.eq("project_id", projectId);
    const { data: rows } = await q;
    if (!rows) { setHabits([]); setLoading(false); return; }
    const ids = rows.map((r: any) => r.id);
    let cmap: Record<string, Set<string>> = {};
    let todaySet = new Set<string>();
    if (ids.length) {
      const since = format(subDays(new Date(), 365), "yyyy-MM-dd");
      const { data: comps } = await supabase
        .from("habit_completions")
        .select("habit_id, completion_date")
        .in("habit_id", ids)
        .gte("completion_date", since);
      (comps || []).forEach((c: any) => {
        if (!cmap[c.habit_id]) cmap[c.habit_id] = new Set();
        cmap[c.habit_id].add(c.completion_date);
        if (c.completion_date === today) todaySet.add(c.habit_id);
      });
    }
    setCompletionsMap(cmap);
    setHabits(rows.map((r: any) => ({ ...r, completed_today: todaySet.has(r.id) })));
    setLoading(false);
  }, [user, projectId, today]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const createHabit = async (input: Partial<Habit> & { title: string }) => {
    if (!user || !input.title.trim()) return null;
    const maxPos = habits.reduce((m, h) => Math.max(m, h.position || 0), 0);
    const payload: any = {
      user_id: user.id,
      project_id: input.project_id ?? projectId ?? null,
      category_id: input.category_id ?? null,
      title: input.title.trim(),
      description: input.description ?? null,
      icon: input.icon ?? "circle",
      frequency_type: input.frequency_type ?? "daily",
      frequency_days: input.frequency_days ?? [],
      time_of_day: input.time_of_day ?? "any",
      position: maxPos + 1,
    };
    const { data } = await supabase.from("habits").insert(payload).select().single();
    if (data) setHabits((prev) => [...prev, { ...(data as any), completed_today: false }]);
    return data;
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    const { data } = await supabase.from("habits").update(updates as any).eq("id", id).select().single();
    if (data) setHabits((prev) => prev.map((h) => h.id === id ? { ...h, ...(data as any) } : h));
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleCompletion = async (habit: Habit, date?: string) => {
    if (!user) return;
    const d = date || today;
    const has = completionsMap[habit.id]?.has(d) ?? false;
    if (has) {
      await supabase.from("habit_completions").delete().eq("habit_id", habit.id).eq("completion_date", d);
      setCompletionsMap((m) => {
        const s = new Set(m[habit.id] || []); s.delete(d);
        return { ...m, [habit.id]: s };
      });
      if (d === today) setHabits((prev) => prev.map((h) => h.id === habit.id ? { ...h, completed_today: false } : h));
    } else {
      await supabase.from("habit_completions").insert({ habit_id: habit.id, user_id: user.id, completion_date: d });
      setCompletionsMap((m) => {
        const s = new Set(m[habit.id] || []); s.add(d);
        return { ...m, [habit.id]: s };
      });
      if (d === today) setHabits((prev) => prev.map((h) => h.id === habit.id ? { ...h, completed_today: true } : h));
    }
  };

  const reorderHabits = async (orderedIds: string[]) => {
    const newMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
    setHabits((prev) => [...prev].sort((a, b) => (newMap.get(a.id) ?? 0) - (newMap.get(b.id) ?? 0)).map((h) => ({ ...h, position: newMap.get(h.id) ?? h.position })));
    await Promise.all(orderedIds.map((id, i) => supabase.from("habits").update({ position: i + 1 }).eq("id", id)));
  };

  const moveHabit = (id: string, dir: -1 | 1) => {
    const ids = [...habits].sort((a, b) => a.position - b.position).map((h) => h.id);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorderHabits(ids);
  };

  return { habits, loading, completionsMap, today, createHabit, updateHabit, deleteHabit, toggleCompletion, reorderHabits, moveHabit };
};

// Returns true if the habit is scheduled for the given date
export const isHabitScheduledOn = (habit: Pick<Habit, "frequency_type" | "frequency_days">, date: Date): boolean => {
  switch (habit.frequency_type) {
    case "daily":
      return true;
    case "weekdays":
    case "weekly":
      return habit.frequency_days.length === 0 ? true : habit.frequency_days.includes(date.getDay());
    case "monthly":
      return habit.frequency_days.length === 0 ? date.getDate() === 1 : habit.frequency_days.includes(date.getDate());
    default:
      return true;
  }
};
