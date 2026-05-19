import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeHabit, HomeHabitTimeOfDay, HomeSectionState } from "@/features/home/types";
import { useState } from "react";

type Props = {
  habits: HomeSectionState<HomeHabit[]>;
  defaultFilter: Exclude<HomeHabitTimeOfDay, "any">;
};

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "morning", label: "Sabah" },
  { id: "noon", label: "Öğlen" },
  { id: "evening", label: "Akşam" },
  { id: "night", label: "Gece" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const HomeHabitsPreview = ({ habits, defaultFilter }: Props) => {
  const [filter, setFilter] = useState<FilterId>(defaultFilter);
  const doneCount = habits.data.filter((habit) => habit.done).length;
  const filterIndex = FILTERS.findIndex((item) => item.id === filter);
  const activeFilter = FILTERS[filterIndex] || FILTERS[0];
  const filteredHabits = filter === "all"
    ? habits.data
    : habits.data.filter((habit) => habit.timeOfDay === filter || habit.timeOfDay === "any");

  const moveFilter = (direction: -1 | 1) => {
    const next = (filterIndex + direction + FILTERS.length) % FILTERS.length;
    setFilter(FILTERS[next].id);
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-light tracking-wide">Alışkanlıklar</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {doneCount} / {habits.data.length}
        </span>
      </header>
      <div className="mx-5 mb-2 flex items-center justify-between rounded-md border border-border/60 bg-background/30 px-2 py-1">
        <button type="button" onClick={() => moveFilter(-1)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Önceki zaman dilimi">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{activeFilter.label}</span>
        <button type="button" onClick={() => moveFilter(1)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Sonraki zaman dilimi">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {habits.status === "loading" && <div className="mx-4 mb-4 h-36 rounded-xl bg-muted/40 animate-pulse" />}
      {habits.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{habits.error || "Alışkanlıklar yüklenemedi."}</div>}
      {(habits.status === "empty" || habits.data.length === 0) && <div className="px-5 pb-5 text-xs text-muted-foreground">Bu zaman diliminde alışkanlık yok.</div>}
      {habits.status === "ready" && filteredHabits.length === 0 && (
        <div className="px-5 pb-5 text-xs text-muted-foreground">Bu zaman diliminde alışkanlık yok.</div>
      )}
      {habits.status === "ready" && filteredHabits.length > 0 && (
        <ul className="px-2 pb-2 divide-y divide-border/40">
          {filteredHabits.map((habit) => {
            const Icon = habit.icon;

            return (
              <li key={habit.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/30 transition-colors cursor-pointer">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center border ${habit.done ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "border-border/70 text-muted-foreground/70"}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className={`flex-1 text-sm tracking-wide ${habit.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {habit.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default HomeHabitsPreview;
