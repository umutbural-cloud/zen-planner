import { useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent } from "react";
import { addDays, format, isBefore, isSameDay, parseISO, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useHabits, isHabitScheduledOn, type Habit } from "@/hooks/useHabits";
import { useHabitCategories, colorHex } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";
import { currentTimeOfDay, useTimeOfDayRanges, type TimeOfDay } from "@/lib/timeOfDay";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import HabitDetailDialog from "./HabitDetailDialog";
import { Circle, CheckCircle2, GripVertical } from "lucide-react";

const displayTimeLabel = (key: TimeOfDay | "all", label: string) => {
  if (key === "all") return "Tümü";
  if (key === "night" && label === "Gece") return "Yatsı";
  return label;
};

const WEEKDAY_LABELS: Record<number, string> = {
  0: "PAZ",
  1: "PZT",
  2: "SAL",
  3: "ÇAR",
  4: "PER",
  5: "CUM",
  6: "CMT",
};

const HabitsToday = () => {
  const { habits, loading, completionsMap, today, toggleCompletion, updateHabit, deleteHabit } = useHabits();
  const { categories } = useHabitCategories();
  const { options: timeOptions } = useTimeOfDayRanges();
  const [defaultFilter] = useHabitTodayDefault();
  const [filter, setFilter] = useState<TimeOfDay | "all">(defaultFilter === "all" ? "all" : currentTimeOfDay());
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);
  const [override, setOverride] = useState<string[] | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStateRef = useRef<{ id: string; lastTargetId: string | null } | null>(null);

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
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [todayDate]);

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: "Tümü" },
      ...timeOptions.map((option) => ({
        key: option.key,
        label: displayTimeLabel(option.key, option.label),
      })),
    ],
    [timeOptions],
  );

  useEffect(() => {
    if (!filterOptions.some((option) => option.key === filter)) {
      setFilter(filterOptions[0]?.key ?? "all");
    }
  }, [filter, filterOptions]);

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

  const weekStatus = useMemo(() => {
    return weekDays.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const planned = ordered.filter((habit) => isHabitScheduledOn(habit, day));
      const completed = planned.length > 0 && planned.every((habit) => completionsMap[habit.id]?.has(dayKey));
      return { date: day, key: dayKey, completed, today: isSameDay(day, todayDate), past: isBefore(day, todayDate) };
    });
  }, [completionsMap, ordered, todayDate, weekDays]);

  const changeFilterBy = (direction: -1 | 1) => {
    const index = filterOptions.findIndex((option) => option.key === filter);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= filterOptions.length) return;
    setFilter(filterOptions[nextIndex].key);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.3) return;
    event.preventDefault();
    swipeLockRef.current = true;
    window.setTimeout(() => {
      swipeLockRef.current = false;
    }, 220);
    changeFilterBy(deltaX < 0 ? 1 : -1);
  };

  const runIfNotSwipe = (callback: () => void) => {
    if (swipeLockRef.current) return;
    callback();
  };

  const persistVisibleOrder = (ids: string[]) => {
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

  const reorderDraggedHabit = (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const ids = visible.map((h) => h.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    persistVisibleOrder(ids);
  };

  const handleDragPointerDown = (habitId: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = { id: habitId, lastTargetId: habitId };
    setDraggingId(habitId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const row = element?.closest<HTMLElement>("[data-habit-row-id]");
    const targetId = row?.dataset.habitRowId;
    if (!targetId || targetId === state.lastTargetId) return;
    state.lastTargetId = targetId;
    reorderDraggedHabit(state.id, targetId);
  };

  const endDrag = () => {
    dragStateRef.current = null;
    setDraggingId(null);
  };

  return (
    <div className="space-y-5 md:space-y-4">
      <div className="grid grid-cols-7 gap-1.5 px-1 py-1">
        {weekStatus.map((day) => (
          <div key={day.key} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-medium uppercase tracking-[0.08em] ${day.today ? "text-foreground" : "text-muted-foreground"}`}>
              {WEEKDAY_LABELS[day.date.getDay()]}
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                day.today
                  ? "bg-foreground text-background shadow-sm"
                  : day.past || day.completed
                    ? "bg-muted text-foreground"
                    : "text-foreground/80"
              }`}
              title={format(day.date, "d MMMM EEEE", { locale: tr })}
            >
              {format(day.date, "d")}
            </span>
          </div>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterOptions.map((option) => {
          const active = filter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-medium tracking-wide transition-colors ${
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-border/70 bg-card/50 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex min-h-[64px] items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0">
              <div className="h-5 w-5 rounded-full bg-muted/70 animate-pulse shrink-0" />
              <div className="h-4 w-4 rounded-sm bg-muted/70 animate-pulse shrink-0" />
              <div className="h-4 flex-1 rounded-sm bg-muted/70 animate-pulse" />
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                {weekDays.map((d) => (
                  <div key={d.toISOString()} className="h-5 w-4 rounded-sm bg-muted/50 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">Boş</p>
          <p className="text-xs">Bu dilim için planlı alışkanlık yok</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border/60 bg-card/80"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {visible.map((h) => {
            const Icon = getHabitIcon(h.icon);
            const completedToday = h.completed_today;
            const cat = categories.find((c) => c.id === h.category_id);
            return (
              <div
                key={h.id}
                data-habit-row-id={h.id}
                className={`group flex min-h-[64px] items-center gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/15 ${
                  draggingId === h.id ? "bg-accent/20" : ""
                }`}
              >
                <button
                  type="button"
                  aria-label={`${h.title} alışkanlığını sırala`}
                  onPointerDown={(event) => handleDragPointerDown(h.id, event)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onTouchStart={(event) => event.stopPropagation()}
                  onTouchEnd={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className="flex h-9 w-7 touch-none items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-accent/30 hover:text-foreground"
                >
                  <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => runIfNotSwipe(() => toggleCompletion(h))}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    completedToday ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={completedToday ? "İşareti kaldır" : "Tamamlandı"}
                >
                  {completedToday ? <CheckCircle2 className="h-5 w-5 text-foreground" strokeWidth={1.5} /> : <Circle className="h-5 w-5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => runIfNotSwipe(() => setOpenHabit(h))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <span className={`truncate text-[15px] font-light leading-6 ${completedToday ? "text-muted-foreground line-through" : "text-foreground"}`}>{h.title}</span>
                  {cat && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorHex(cat.color) }} />
                      {cat.name}
                    </span>
                  )}
                </button>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {weekDays.map((d) => {
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
