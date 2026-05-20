import { useMemo } from "react";
import { parseISO } from "date-fns";
import { useHabits, isHabitScheduledOn } from "@/hooks/useHabits";
import { getHabitIcon } from "@/lib/habitIcons";
import { currentTimeOfDay } from "@/lib/timeOfDay";
import type { HomeHabit, HomeHabitTimeOfDay, HomeSectionState } from "@/features/home/types";

const toHomeTimeOfDay = (value: string | null | undefined): HomeHabitTimeOfDay => {
  if (value === "morning" || value === "noon" || value === "evening" || value === "night" || value === "any") return value;
  if (value === "ikindi") return "noon";
  return "any";
};

const toDefaultFilter = (): Exclude<HomeHabitTimeOfDay, "any"> => {
  const current = currentTimeOfDay();
  return current === "ikindi" ? "noon" : current;
};

export const useHomeHabitsData = (): HomeSectionState<HomeHabit[]> & {
  defaultFilter: Exclude<HomeHabitTimeOfDay, "any">;
  toggleHabit: (habitId: string) => Promise<void>;
} => {
  const { habits, loading, today, toggleCompletion } = useHabits();

  const data = useMemo(() => {
    const todayDate = parseISO(today);
    return habits
      .filter((habit) => isHabitScheduledOn(habit, todayDate))
      .sort((a, b) => a.position - b.position)
      .map<HomeHabit>((habit) => ({
        id: habit.id,
        label: habit.title,
        done: habit.completed_today,
        icon: getHabitIcon(habit.icon),
        timeOfDay: toHomeTimeOfDay(habit.time_of_day),
      }));
  }, [habits, today]);

  return {
    status: loading ? "loading" : data.length > 0 ? "ready" : "empty",
    data,
    defaultFilter: toDefaultFilter(),
    toggleHabit: async (habitId: string) => {
      const habit = habits.find((item) => item.id === habitId);
      if (!habit) return;
      await toggleCompletion(habit);
    },
  };
};
