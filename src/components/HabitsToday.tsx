import { useEffect, useMemo, useState } from "react";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useHabits, isHabitScheduledOn, type Habit } from "@/hooks/useHabits";
import { useHabitCategories, colorHex } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";
import { TIME_OF_DAY_OPTIONS, currentTimeOfDay, type TimeOfDay } from "@/lib/timeOfDay";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import HabitDetailDialog from "./HabitDetailDialog";
import { Circle, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";

const HabitsToday = () => {
  const { habits, completionsMap, today, toggleCompletion, updateHabit, deleteHabit } = useHabits();
  const { categories } = useHabitCategories();
  const [defaultFilter] = useHabitTodayDefault();
  const [filter, setFilter] = useState<TimeOfDay | "all">(defaultFilter === "all" ? "all" : currentTimeOfDay());
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);
  const [override, setOverride] = useState<string[] | null>(null);

  // load per-day local override
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`habits-order-${today}`);
      setOverride(raw ? JSON.parse(raw) : null);
    } catch {
      setOverride(null);
    }
  }, [today]);

  const todayDate = parseISO(today);
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(todayDate, 6 - i)), [todayDate]);

  const baseSorted = [...habits].sort((a, b) => a.position - b.position);
  const ordered = useMemo(() => {
    if (!override) return baseSorted;
    const idx = new Map(override.map((id, i) => [id, i]));
    return [...baseSorted].sort((a, b) => (idx.get(a.id) ?? 9999) - (idx.get(b.id) ?? 9999));
  }, [baseSorted, override]);

  const visible = ordered.filter((h) => {
    if (!isHabitScheduledOn(h, todayDate)) return false;
    if (filter === "all") return true;
    return h.time_of_day === filter || h.time_of_day === "any";
  });

  const move = (id: string, dir: -1 | 1) => {
    const ids = visible.map((h) => h.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // merge with full ordered list (only reorder visible items relatively)
    const fullIds = ordered.map((h) => h.id);
    const visibleSet = new Set(ids);
    const result: string[] = [];
    let vi = 0;
    fullIds.forEach((fid) => {
      if (visibleSet.has(fid)) { result.push(ids[vi++]); }
      else result.push(fid);
    });
    setOverride(result);
    try {
      localStorage.setItem(`habits-order-${today}`, JSON.stringify(result));
    } catch {
      // Persistence is optional; keep the in-memory order for this render.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${filter === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
        >Tümü</button>
        {TIME_OF_DAY_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setFilter(o.key)}
            className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${filter === o.key ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
          >{o.label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Bu dilim için planlı alışkanlık yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
          {visible.map((h, i) => {
            const Icon = getHabitIcon(h.icon);
            const completedToday = h.completed_today;
            const cat = categories.find((c) => c.id === h.category_id);
            return (
              <div key={h.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/20 transition-colors group">
                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => move(h.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => move(h.id, 1)} disabled={i === visible.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => toggleCompletion(h)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title={completedToday ? "İşareti kaldır" : "Tamamlandı"}
                >
                  {completedToday ? <CheckCircle2 className="h-5 w-5 text-foreground" strokeWidth={1.5} /> : <Circle className="h-5 w-5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => setOpenHabit(h)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className={`text-sm font-light truncate ${completedToday ? "line-through text-muted-foreground" : ""}`}>{h.title}</span>
                  {cat && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorHex(cat.color) }} />
                      {cat.name}
                    </span>
                  )}
                </button>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {last7.map((d) => {
                    const ds = format(d, "yyyy-MM-dd");
                    const done = completionsMap[h.id]?.has(ds);
                    const isToday = isSameDay(d, todayDate);
                    return (
                      <div key={ds} className="flex flex-col items-center gap-0.5" title={format(d, "d MMM EEE", { locale: tr })}>
                        <span className={`text-[8px] tracking-wider uppercase ${isToday ? "text-foreground" : "text-muted-foreground/60"}`}>
                          {format(d, "EEEEEE", { locale: tr })}
                        </span>
                        {done
                          ? <CheckCircle2 className="h-3 w-3 text-foreground" strokeWidth={1.5} />
                          : <Circle className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HabitDetailDialog
        open={!!openHabit}
        habit={openHabit}
        onClose={() => setOpenHabit(null)}
        onSave={updateHabit}
        onDelete={deleteHabit}
      />
    </div>
  );
};

export default HabitsToday;
