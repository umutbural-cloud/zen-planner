import type { HomeHabit, HomeSectionState } from "@/features/home/types";

type Props = {
  habits: HomeSectionState<HomeHabit[]>;
};

const HomeHabitsPreview = ({ habits }: Props) => {
  const doneCount = habits.data.filter((habit) => habit.done).length;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-light tracking-wide">Alışkanlıklar</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {doneCount} / {habits.data.length}
        </span>
      </header>

      {habits.status === "loading" && <div className="mx-4 mb-4 h-36 rounded-xl bg-muted/40 animate-pulse" />}
      {habits.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{habits.error || "Alışkanlıklar yüklenemedi."}</div>}
      {(habits.status === "empty" || habits.data.length === 0) && <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün için alışkanlık yok.</div>}
      {habits.status === "ready" && (
        <ul className="px-2 pb-2 divide-y divide-border/40">
          {habits.data.map((habit) => {
            const Icon = habit.icon;

            return (
              <li key={habit.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/30 transition-colors cursor-pointer">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center border ${habit.done ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "border-border/70 text-muted-foreground/70"}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className={`flex-1 text-sm tracking-wide ${habit.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {habit.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground/80">
                  {habit.streak ? `${habit.streak} gün` : "-"}
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
