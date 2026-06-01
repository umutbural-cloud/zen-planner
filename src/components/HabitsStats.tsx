import { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { useHabits, isHabitScheduledOn } from "@/hooks/useHabits";
import { useHabitCategories, colorHex, type HabitCategory } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";

type Range = "week" | "month" | "year";

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, year: 365 };
const RANGE_LABEL: Record<Range, string> = { week: "Hafta", month: "Ay", year: "Yıl" };
const UNCATEGORIZED: HabitCategory = {
  id: "__none__",
  name: "Kategorisiz",
  color: "gray",
  position: 999,
  user_id: "",
};

const HabitsStats = () => {
  const { habits, loading, completionsMap, today } = useHabits();
  const { categories } = useHabitCategories();
  const [range, setRange] = useState<Range>("week");

  const { stats, totals, byCategory } = useMemo(() => {
    const days = RANGE_DAYS[range];
    const end = parseISO(today);
    const start = subDays(end, days - 1);
    const dateList = eachDayOfInterval({ start, end });

    const stats = habits.map((h) => {
      const scheduled = dateList.filter((d) => isHabitScheduledOn(h, d));
      const set = completionsMap[h.id] || new Set<string>();
      const completed = scheduled.filter((d) => set.has(format(d, "yyyy-MM-dd"))).length;
      const total = scheduled.length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      let cur = 0, best = 0;
      scheduled.forEach((d) => {
        if (set.has(format(d, "yyyy-MM-dd"))) { cur++; best = Math.max(best, cur); }
        else cur = 0;
      });
      return { habit: h, completed, total, rate, best };
    });

    // weekly / monthly / all-time totals (count of completion records across scheduled habits)
    const allCompletionDates = habits.flatMap((h) => Array.from(completionsMap[h.id] || []));
    const ymd = (d: Date) => format(d, "yyyy-MM-dd");
    const weekStart = ymd(subDays(end, 6));
    const monthStart = ymd(subDays(end, 29));
    const totals = {
      week: allCompletionDates.filter((d) => d >= weekStart && d <= today).length,
      month: allCompletionDates.filter((d) => d >= monthStart && d <= today).length,
      all: allCompletionDates.length,
    };

    // category aggregates within selected range
    const byCategory = categories.flatMap((c) => {
      const hs = stats.filter((s) => s.habit.category_id === c.id);
      if (hs.length === 0) return [];
      const completed = hs.reduce((a, s) => a + s.completed, 0);
      const total = hs.reduce((a, s) => a + s.total, 0);
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return [{ category: c, completed, total, rate, count: hs.length }];
    });
    const uncatHs = stats.filter((s) => !s.habit.category_id);
    if (uncatHs.length) {
      const completed = uncatHs.reduce((a, s) => a + s.completed, 0);
      const total = uncatHs.reduce((a, s) => a + s.total, 0);
      byCategory.push({
        category: UNCATEGORIZED,
        completed, total,
        rate: total === 0 ? 0 : Math.round((completed / total) * 100),
        count: uncatHs.length,
      });
    }

    return { stats, totals, byCategory };
  }, [habits, completionsMap, today, range, categories]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2">
          <SummarySkeleton />
          <SummarySkeleton />
          <SummarySkeleton />
        </div>
        <div className="h-7 w-40 rounded-sm bg-muted/60 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-sm bg-muted/60 animate-pulse" />
          <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
            {[0, 1, 2].map((item) => (
              <div key={item} className="px-3 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm bg-muted/70 animate-pulse" />
                  <div className="h-4 flex-1 rounded-sm bg-muted/70 animate-pulse" />
                  <div className="h-4 w-10 rounded-sm bg-muted/70 animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-muted/60 rounded-sm animate-pulse" />
                <div className="h-3 w-32 rounded-sm bg-muted/50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard label="Bu hafta" value={totals.week} sub="tamamlama" />
        <SummaryCard label="Bu ay" value={totals.month} sub="tamamlama" />
        <SummaryCard label="Tüm zaman" value={totals.all} sub="tamamlama" />
      </div>

      <div className="flex items-center gap-1">
        {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${range === r ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
          >{RANGE_LABEL[r]}</button>
        ))}
      </div>

      {byCategory.length > 0 && (
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light mb-2">Kategori</div>
          <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
            {byCategory.map(({ category, completed, total, rate, count }) => (
              <div key={category.id} className="px-3 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorHex(category.color) }} />
                  <span className="text-sm font-light flex-1 truncate">{category.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{count} alışkanlık</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{rate}%</span>
                </div>
                <div className="h-1.5 w-full bg-accent/30 rounded-sm overflow-hidden">
                  <div className="h-full" style={{ width: `${rate}%`, background: colorHex(category.color) }} />
                </div>
                <div className="text-[10px] tracking-wide text-muted-foreground">{completed} / {total} tamamlama</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light mb-2">Alışkanlıklar</div>
        {stats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>İstatistik için alışkanlık ekleyin</p>
          </div>
        ) : (
          <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
            {stats.map(({ habit, completed, total, rate, best }) => {
              const Icon = getHabitIcon(habit.icon);
              return (
                <div key={habit.id} className="px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm font-light flex-1 truncate">{habit.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{rate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent/30 rounded-sm overflow-hidden">
                    <div className="h-full bg-foreground/60" style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] tracking-wide text-muted-foreground">
                    <span>{completed} / {total} tamamlama</span>
                    <span>En uzun seri: {best} gün</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, sub }: { label: string; value: number; sub: string }) => (
  <div className="border border-border/60 rounded-sm px-3 py-3">
    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{label}</div>
    <div className="text-2xl font-light tracking-wide tabular-nums mt-1">{value}</div>
    <div className="text-[10px] text-muted-foreground tracking-wide">{sub}</div>
  </div>
);

const SummarySkeleton = () => (
  <div className="border border-border/60 rounded-sm px-3 py-3">
    <div className="h-3 w-16 rounded-sm bg-muted/60 animate-pulse" />
    <div className="h-8 w-10 rounded-sm bg-muted/70 animate-pulse mt-2" />
    <div className="h-3 w-20 rounded-sm bg-muted/50 animate-pulse mt-2" />
  </div>
);

export default HabitsStats;
