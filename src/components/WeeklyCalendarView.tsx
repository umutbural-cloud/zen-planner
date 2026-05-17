import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks, Task, TaskColor, TaskKind } from "@/hooks/useTasks";
import { usePomodoroSessions } from "@/hooks/usePomodoroSessions";
import { TASK_COLORS, colorClasses } from "@/lib/taskColors";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TaskEditDialog from "./TaskEditDialog";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 44; // px per hour slot

type Mode = "day" | "week" | "month";
type SlotInfo = { date: Date; startMin: number; endMin: number };
type TaskLayout = { task: Task; startMin: number; endMin: number; lane: number; laneCount: number };

const timeToMinutes = (value: string | null | undefined, fallback = 0) => {
  if (!value) return fallback;
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  return Math.max(0, Math.min(24 * 60, hours * 60 + minutes));
};

const minutesToTime = (minutes: number) => {
  const safe = Math.max(0, Math.min((24 * 60) - 1, Math.round(minutes)));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const normalizedTimeRange = (start: string, end: string) => {
  const startMin = timeToMinutes(start, 9 * 60);
  const rawEndMin = timeToMinutes(end, startMin + 60);
  const endMin = rawEndMin > startMin ? rawEndMin : Math.min(24 * 60, startMin + 60);
  return { startTime: minutesToTime(startMin), endTime: minutesToTime(endMin) };
};

const minutesFromPointer = (e: React.PointerEvent | PointerEvent, slot: HTMLElement, slotMinutes: number) => {
  const [, hourStr] = slot.dataset.slotKey!.split("|");
  const hour = parseInt(hourStr, 10);
  const rect = slot.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(0.999, (e.clientY - rect.top) / rect.height));
  const step = Math.floor(ratio * (60 / slotMinutes));
  return Math.min((24 * 60) - slotMinutes, (hour * 60) + (step * slotMinutes));
};

const ColorPicker = ({ value, onChange }: { value: TaskColor; onChange: (c: TaskColor) => void }) => (
  <div className="flex items-center gap-1.5">
    {TASK_COLORS.map((c) => (
      <button
        key={c.value}
        type="button"
        onClick={() => onChange(c.value)}
        title={c.label}
        className={`h-5 w-5 rounded-full border transition-all ${colorClasses(c.value, "swatch")} ${
          value === c.value ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "opacity-70 hover:opacity-100"
        }`}
      />
    ))}
  </div>
);

const WeeklyCalendarView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const [current, setCurrent] = useState(new Date());
  const [mode, setMode] = useState<Mode>("week");
  const slotMinutes = mode === "day" ? 10 : 15;
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<TaskColor>("gray");
  const [newKind, setNewKind] = useState<TaskKind>("task");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Drag-to-create state (mouse + touch)
  const [dragging, setDragging] = useState<{ day: Date; startMin: number; currentMin: number } | null>(null);
  const dragRef = useRef<{ day: Date; startMin: number; moved: boolean } | null>(null);
  const suppressNextTaskClickRef = useRef(false);

  // Move-existing-block state
  const [movingTask, setMovingTask] = useState<{ id: string; day: Date; startMin: number; durationMin: number } | null>(null);
  const moveRef = useRef<{ id: string; durationMin: number; pointerOffsetMin: number; lastDay: Date; lastStartMin: number; moved: boolean } | null>(null);

  // Resize existing task from the bottom edge
  const [resizingTask, setResizingTask] = useState<{ id: string; day: Date; startMin: number; endMin: number } | null>(null);
  const resizeRef = useRef<{ id: string; day: Date; startMin: number; endMin: number; moved: boolean } | null>(null);

  const days = useMemo(() => {
    if (mode === "day") return [current];
    if (mode === "week") {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current, mode]);

  // Pomodoro sessions for the visible range
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const { sessions } = usePomodoroSessions(
    new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0),
    new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59),
  );

  const calendarTasks = useMemo(
    () => tasks.filter((t) => !t.hidden && !t.parent_block_id && t.status !== "done"),
    [tasks]
  );
  const projectTaskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const visibleSessions = useMemo(
    () => sessions.filter((s) => !s.task_id || projectTaskIds.has(s.task_id)),
    [sessions, projectTaskIds]
  );

  const getTasksForDay = (day: Date) =>
    calendarTasks.filter((t) => {
      if (t.start_date && t.end_date) {
        return isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
      }
      if (t.start_date) return isSameDay(day, parseISO(t.start_date));
      return false;
    });

  const getTimedLayoutForDay = (day: Date): TaskLayout[] => {
    const segments = getTasksForDay(day)
      .filter((task) => task.start_time && task.kind !== "timebox")
      .map((task) => {
        const startsToday = task.start_date ? isSameDay(parseISO(task.start_date), day) : false;
        const endsToday = task.end_date ? isSameDay(parseISO(task.end_date), day) : startsToday;
        const startMin = startsToday ? timeToMinutes(task.start_time, 0) : 0;
        const endFallback = startMin + 60;
        const rawEndMin = endsToday ? timeToMinutes(task.end_time, endFallback) : 24 * 60;
        const endMin = Math.max(startMin + 30, rawEndMin > startMin ? rawEndMin : endFallback);
        return { task, startMin, endMin: Math.min(24 * 60, endMin), lane: 0, laneCount: 1 };
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const laneEnds: number[] = [];
    segments.forEach((segment) => {
      const lane = laneEnds.findIndex((end) => end <= segment.startMin);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      segment.lane = nextLane;
      laneEnds[nextLane] = segment.endMin;
    });

    segments.forEach((segment) => {
      const overlapping = segments.filter(
        (other) => other.startMin < segment.endMin && other.endMin > segment.startMin
      );
      segment.laneCount = Math.max(1, Math.max(...overlapping.map((other) => other.lane)) + 1);
    });

    return segments;
  };

  const getTimeboxLayoutForDay = (day: Date): TaskLayout[] =>
    getTasksForDay(day)
      .filter((task) => task.start_time && task.kind === "timebox")
      .map((task) => {
        const startsToday = task.start_date ? isSameDay(parseISO(task.start_date), day) : false;
        const endsToday = task.end_date ? isSameDay(parseISO(task.end_date), day) : startsToday;
        const startMin = startsToday ? timeToMinutes(task.start_time, 0) : 0;
        const endFallback = startMin + 60;
        const rawEndMin = endsToday ? timeToMinutes(task.end_time, endFallback) : 24 * 60;
        const endMin = Math.max(startMin + 30, rawEndMin > startMin ? rawEndMin : endFallback);
        return { task, startMin, endMin: Math.min(24 * 60, endMin), lane: 0, laneCount: 1 };
      });

  const navigate = (dir: number) => {
    setCurrent(mode === "day" ? addDays(current, dir) : mode === "week" ? addWeeks(current, dir) : addMonths(current, dir));
  };

  const openSlot = (date: Date, startMin: number, endMin: number) => {
    const safeStart = Math.max(0, Math.min((24 * 60) - slotMinutes, startMin));
    const safeEnd = Math.max(safeStart + slotMinutes, Math.min(24 * 60, endMin));
    setSelectedSlot({ date, startMin: safeStart, endMin: safeEnd });
    setStartTime(minutesToTime(safeStart));
    setEndTime(minutesToTime(safeEnd));
    setNewTitle("");
    setNewColor("gray");
    setNewKind("task");
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedSlot) return;
    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");
    const range = normalizedTimeRange(startTime, endTime);
    await createTask({
      title: newTitle.trim(),
      start_date: dateStr,
      end_date: dateStr,
      start_time: range.startTime,
      end_time: range.endTime,
      color: newColor,
      kind: newKind,
    });
    setNewTitle("");
    setSelectedSlot(null);
  };

  // Pointer handlers for drag-to-create (works on mouse + touch via Pointer Events)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setSlotRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(key, el);
    else slotRefs.current.delete(key);
  };

  const handlePointerDown = (e: React.PointerEvent, day: Date, hour: number) => {
    // ignore right click
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const startMin = minutesFromPointer(e, e.currentTarget as HTMLElement, slotMinutes);
    dragRef.current = { day, startMin, moved: false };
    setDragging({ day, startMin, currentMin: startMin });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizeRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
      if (!slot) return;
      const [dayStr] = slot.dataset.slotKey!.split("|");
      const day = parseISO(dayStr);
      if (!isSameDay(day, resizeRef.current.day)) return;
      const pointerMin = minutesFromPointer(e, slot, slotMinutes);
      const endMin = Math.min(24 * 60, Math.max(resizeRef.current.startMin + slotMinutes, pointerMin + slotMinutes));
      resizeRef.current.moved = true;
      resizeRef.current.endMin = endMin;
      setResizingTask({ id: resizeRef.current.id, day, startMin: resizeRef.current.startMin, endMin });
      return;
    }

    // Moving existing block?
    if (moveRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
      if (!slot) return;
      const [dayStr, hourStr] = slot.dataset.slotKey!.split("|");
      const day = parseISO(dayStr);
      const minute = minutesFromPointer(e, slot, slotMinutes);
      const startMin = Math.max(0, Math.min((24 * 60) - moveRef.current.durationMin, minute - moveRef.current.pointerOffsetMin));
      moveRef.current.moved = true;
      moveRef.current.lastDay = day;
      moveRef.current.lastStartMin = startMin;
      setMovingTask({ id: moveRef.current.id, day, startMin, durationMin: moveRef.current.durationMin });
      return;
    }

    if (!dragRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
    if (!slot) return;
    const key = slot.dataset.slotKey!;
    const [dayStr, hourStr] = key.split("|");
    if (dayStr !== format(dragRef.current.day, "yyyy-MM-dd")) return;
    const minute = minutesFromPointer(e, slot, slotMinutes);
    if (minute !== dragging?.currentMin) {
      dragRef.current.moved = true;
      setDragging((d) => (d ? { ...d, currentMin: minute } : null));
    }
  };

  const handlePointerUp = () => {
    if (resizeRef.current) {
      const r = resizeRef.current;
      if (r.moved) {
        suppressNextTaskClickRef.current = true;
        window.setTimeout(() => { suppressNextTaskClickRef.current = false; }, 0);
        updateTask(r.id, {
          end_date: format(r.day, "yyyy-MM-dd"),
          end_time: minutesToTime(r.endMin),
        });
      }
      resizeRef.current = null;
      setResizingTask(null);
      return;
    }

    // Finish moving existing block
    if (moveRef.current) {
      const m = moveRef.current;
      if (m.moved) {
        suppressNextTaskClickRef.current = true;
        window.setTimeout(() => { suppressNextTaskClickRef.current = false; }, 0);
        const newStartMin = Math.max(0, Math.min(24 * 60 - slotMinutes, m.lastStartMin));
        const newEndMin = Math.min(24 * 60, newStartMin + Math.max(slotMinutes, m.durationMin));
        const dateStr = format(m.lastDay, "yyyy-MM-dd");
        updateTask(m.id, {
          start_date: dateStr,
          end_date: dateStr,
          start_time: minutesToTime(newStartMin),
          end_time: minutesToTime(newEndMin),
        });
      }
      moveRef.current = null;
      setMovingTask(null);
      return;
    }

    if (dragging && dragRef.current) {
      const startMin = Math.min(dragging.startMin, dragging.currentMin);
      const endMin = Math.max(dragging.startMin, dragging.currentMin) + slotMinutes;
      openSlot(dragging.day, startMin, endMin);
    }
    dragRef.current = null;
    setDragging(null);
  };

  const startMoveTask = (e: React.PointerEvent, t: Task) => {
    if (!t.start_time || !t.start_date) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const startMin = timeToMinutes(t.start_time);
    const endMin = timeToMinutes(t.end_time, startMin + 60);
    const dur = Math.max(slotMinutes, endMin - startMin);
    moveRef.current = {
      id: t.id, durationMin: dur, pointerOffsetMin: startMin % 60,
      lastDay: parseISO(t.start_date), lastStartMin: startMin, moved: false,
    };
    setMovingTask({ id: t.id, day: parseISO(t.start_date), startMin, durationMin: dur });
  };

  const startResizeTask = (e: React.PointerEvent, t: Task) => {
    if (!t.start_time || !t.start_date) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const startMin = timeToMinutes(t.start_time);
    const endMin = Math.max(startMin + slotMinutes, timeToMinutes(t.end_time, startMin + 60));
    const day = parseISO(t.start_date);
    resizeRef.current = { id: t.id, day, startMin, endMin, moved: false };
    setResizingTask({ id: t.id, day, startMin, endMin });
  };

  // Helper: a click handler for task block — only opens dialog if drag did NOT happen
  const handleTaskClick = (e: React.MouseEvent, t: Task) => {
    e.stopPropagation();
    if (moveRef.current?.moved || resizeRef.current?.moved || suppressNextTaskClickRef.current) return;
    setEditTask(t);
  };

  // Cancel any stuck drag if pointer leaves the page
  useEffect(() => {
    const cancel = () => { dragRef.current = null; setDragging(null); moveRef.current = null; setMovingTask(null); resizeRef.current = null; setResizingTask(null); };
    window.addEventListener("pointercancel", cancel);
    return () => window.removeEventListener("pointercancel", cancel);
  }, []);

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const timeGridTemplate = { gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg tracking-wide">
          {mode === "day" ? "日 — Gün" : mode === "week" ? "週 — Hafta" : "月 — Ay"}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-border/60 rounded-sm overflow-hidden">
            <button
              onClick={() => setMode("day")}
              className={`text-xs px-2.5 py-1 ${mode === "day" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Gün
            </button>
            <button
              onClick={() => setMode("week")}
              className={`text-xs px-2.5 py-1 ${mode === "week" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Hafta
            </button>
            <button
              onClick={() => setMode("month")}
              className={`text-xs px-2.5 py-1 ${mode === "month" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Ay
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground min-w-[140px] sm:min-w-[180px] text-center">
            {mode === "day"
              ? format(current, "d MMMM yyyy, EEEE", { locale: tr })
              : mode === "week"
                ? `${format(days[0], "d MMM", { locale: tr })} – ${format(days[6], "d MMM yyyy", { locale: tr })}`
                : format(current, "MMMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrent(new Date())}>
            Bugün
          </Button>
        </div>
      </div>

      {mode !== "month" ? (
        <div
          className="border border-border/60 rounded-sm overflow-hidden select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Day headers */}
          <div className="grid border-b border-border/60 bg-card/30" style={timeGridTemplate}>
            <div />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className="text-center p-2 border-l border-border/30">
                  <div className="text-[10px] text-muted-foreground tracking-wide">{mode === "day" ? format(day, "EEEE", { locale: tr }) : weekDays[i]}</div>
                  <div className={`text-sm mt-0.5 ${isToday ? "text-foreground font-medium" : "text-muted-foreground font-light"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day row */}
          <div className="grid border-b border-border/60 min-h-[40px]" style={timeGridTemplate}>
            <div className="text-[9px] text-muted-foreground p-1.5 tracking-wide">tüm gün</div>
            {days.map((day, i) => {
              const dayTasks = getTasksForDay(day).filter((t) => !t.start_time);
              return (
                <div
                  key={i}
                  className="border-l border-border/30 p-1 space-y-0.5 cursor-pointer hover:bg-card/40"
                  onClick={() => openSlot(day, 9 * 60, 10 * 60)}
                >
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => handleTaskClick(e, t)}
                      className={`text-[10px] font-light truncate px-1.5 py-1 rounded-sm border-l-2 transition-colors ${colorClasses(t.color)}`}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Hour grid */}
          <div className="max-h-[60vh] overflow-y-auto relative touch-pan-y">
            {HOURS.map((hour) => (
              <div key={hour} className="grid border-b border-border/30" style={{ ...timeGridTemplate, minHeight: SLOT_HEIGHT }}>
                <div className="text-[10px] text-muted-foreground p-1.5 tracking-wide">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map((day, i) => {
                  const isDraggingThis =
                    dragging && isSameDay(dragging.day, day) &&
                    hour * 60 < Math.max(dragging.startMin, dragging.currentMin) + slotMinutes &&
                    (hour + 1) * 60 > Math.min(dragging.startMin, dragging.currentMin);
                  const timedLayouts = getTimedLayoutForDay(day).filter(
                    (layout) => Math.floor(layout.startMin / 60) === hour
                  );
                  const dayTimeboxes = getTimeboxLayoutForDay(day);
                  const timeboxLayouts = dayTimeboxes.filter(
                    (layout) => Math.floor(layout.startMin / 60) === hour
                  );
                  // Pomodoro sessions starting in this hour, for this day
                  const hourSessions = visibleSessions.filter((s) => {
                    const d = parseISO(s.started_at);
                    return isSameDay(d, day) && d.getHours() === hour;
                  });
                  const slotKey = `${format(day, "yyyy-MM-dd")}|${hour}`;
                  return (
                    <div
                      key={i}
                      ref={setSlotRef(slotKey)}
                      data-slot-key={slotKey}
                      onPointerDown={(e) => handlePointerDown(e, day, hour)}
                      className={`border-l border-border/30 cursor-pointer transition-colors relative touch-none ${
                        isDraggingThis ? "bg-foreground/15" : "hover:bg-card/40"
                      }`}
                    >
                      {dragging && isSameDay(dragging.day, day) && Math.floor(Math.min(dragging.startMin, dragging.currentMin) / 60) === hour && (
                        <div
                          className="absolute inset-x-1 rounded-sm border border-foreground/40 bg-foreground/10 pointer-events-none z-30"
                          style={{
                            top: `${((Math.min(dragging.startMin, dragging.currentMin) % 60) / 60) * SLOT_HEIGHT + 1}px`,
                            height: `${((Math.max(dragging.startMin, dragging.currentMin) - Math.min(dragging.startMin, dragging.currentMin) + slotMinutes) / 60) * SLOT_HEIGHT - 2}px`,
                          }}
                        />
                      )}

                      {/* Time-boxes are rendered as containers behind tasks. They do not consume task lanes. */}
                      {timeboxLayouts.map((layout) => {
                        const t = layout.task;
                        const topPx = ((layout.startMin % 60) / 60) * SLOT_HEIGHT + 1;
                        const heightPx = Math.max(20, ((layout.endMin - layout.startMin) / 60) * SLOT_HEIGHT - 2);
                        return (
                          <div
                            key={t.id}
                            onPointerDown={(e) => startMoveTask(e, t)}
                            onClick={(e) => handleTaskClick(e, t)}
                            title={t.title}
                            className={`group absolute left-0.5 right-[18px] px-1.5 py-1 rounded-sm border border-dashed text-[10px] font-light cursor-grab active:cursor-grabbing z-0 opacity-55 ${colorClasses(t.color)}`}
                            style={{ top: topPx, height: `${heightPx}px` }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <Timer className="h-2.5 w-2.5 opacity-70 shrink-0" />
                              <span className="truncate">{t.title}</span>
                            </div>
                            <div className="text-[9px] opacity-70">{t.start_time?.slice(0,5)}{t.end_time && `–${t.end_time.slice(0,5)}`}</div>
                            <button
                              type="button"
                              aria-label="Süreyi değiştir"
                              onPointerDown={(e) => startResizeTask(e, t)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-sm opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-50" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Timed tasks. Overlaps are split into lanes above time-box containers. */}
                      {timedLayouts.map((layout) => {
                        const t = layout.task;
                        const containedByTimebox = dayTimeboxes.some(
                          (box) => layout.startMin >= box.startMin && layout.endMin <= box.endMin
                        );
                        const topPx = ((layout.startMin % 60) / 60) * SLOT_HEIGHT + 1;
                        const heightPx = Math.max(20, ((layout.endMin - layout.startMin) / 60) * SLOT_HEIGHT - 2);
                        const lanePercent = 100 / layout.laneCount;
                        const laneWidth = `calc(${lanePercent}% - ${containedByTimebox ? "16px" : "6px"})`;
                        const laneLeft = `calc(${lanePercent * layout.lane}% + ${containedByTimebox ? "12px" : "2px"})`;
                        return (
                          <div
                            key={t.id}
                            onPointerDown={(e) => startMoveTask(e, t)}
                            onClick={(e) => handleTaskClick(e, t)}
                            title={t.title}
                            className={`group absolute px-1.5 py-1 rounded-sm text-[10px] font-light truncate cursor-grab active:cursor-grabbing z-10 border-l-2 shadow-sm ${containedByTimebox ? "ring-1 ring-background/70" : ""} ${colorClasses(t.color)}`}
                            style={{ top: topPx, left: laneLeft, width: laneWidth, height: `${heightPx}px` }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">{t.title}</span>
                            </div>
                            <div className="text-[9px] opacity-70">{t.start_time?.slice(0,5)}{t.end_time && `–${t.end_time.slice(0,5)}`}</div>
                            <button
                              type="button"
                              aria-label="Süreyi değiştir"
                              onPointerDown={(e) => startResizeTask(e, t)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-sm opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-50" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Move ghost */}
                      {movingTask && isSameDay(movingTask.day, day) && Math.floor(movingTask.startMin / 60) === hour && (
                        <div
                          className="absolute inset-x-0 rounded-sm border border-dashed border-foreground/50 bg-foreground/10 z-20 pointer-events-none"
                          style={{
                            top: `${((movingTask.startMin % 60) / 60) * SLOT_HEIGHT + 1}px`,
                            height: `${(movingTask.durationMin / 60) * SLOT_HEIGHT - 2}px`,
                          }}
                        />
                      )}

                      {resizingTask && isSameDay(resizingTask.day, day) && Math.floor(resizingTask.startMin / 60) === hour && (
                        <div
                          className="absolute inset-x-1 rounded-sm border border-foreground/45 bg-foreground/10 z-20 pointer-events-none"
                          style={{
                            top: `${((resizingTask.startMin % 60) / 60) * SLOT_HEIGHT + 1}px`,
                            height: `${((resizingTask.endMin - resizingTask.startMin) / 60) * SLOT_HEIGHT - 2}px`,
                          }}
                        />
                      )}

                      {/* Pomodoro session bars — thicker, with popover */}
                      {hourSessions.map((s) => {
                        const sd = parseISO(s.started_at);
                        const ed = parseISO(s.ended_at);
                        const startMins = sd.getMinutes();
                        const totalMins = (ed.getTime() - sd.getTime()) / 60000;
                        const heightHrs = Math.max(0.25, totalMins / 60);
                        const topPx = (startMins / 60) * SLOT_HEIGHT;
                        const hrs = Math.floor(totalMins / 60);
                        const mins = Math.round(totalMins % 60);
                        const durLabel = hrs > 0 ? `${hrs} sa ${mins} dk` : `${mins} dk`;
                        return (
                          <Popover key={s.id}>
                            <PopoverTrigger asChild>
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0.5 w-3 rounded-sm bg-rose-400/90 hover:bg-rose-500 dark:bg-rose-500/90 dark:hover:bg-rose-400 z-20 transition-colors"
                                style={{ top: topPx + 1, height: `${heightHrs * SLOT_HEIGHT - 2}px` }}
                                aria-label="Pomodoro detayı"
                              />
                            </PopoverTrigger>
                            <PopoverContent side="left" align="start" className="w-56 p-3 text-xs">
                              <div className="font-medium tracking-wide mb-1">Pomodoro</div>
                              <div className="text-muted-foreground">
                                {format(sd, "HH:mm")} – {format(ed, "HH:mm")}
                              </div>
                              <div className="text-muted-foreground">Süre: {durLabel}</div>
                              {s.note && (
                                <div className="mt-2 pt-2 border-t border-border/40 text-foreground/80 whitespace-pre-wrap">
                                  {s.note}
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground bg-card/20">
            <div className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-3 rounded-sm bg-rose-400/90" />
              <span>Pomodoro (üzerine gel/tıkla)</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-2.5 w-2.5" />
              <span>Time-box</span>
            </div>
            <span className="hidden sm:inline ml-auto">Boş bir slota tıkla veya sürükle</span>
          </div>
        </div>
      ) : (
        // MONTH VIEW
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/60 bg-card/30">
            {weekDays.map((d) => (
              <div key={d} className="text-center p-2 border-l first:border-l-0 border-border/30 text-[10px] text-muted-foreground tracking-wide">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[100px]">
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, current);
              const dayTasks = getTasksForDay(day);
              return (
                <div
                  key={i}
                  className={`border-l border-t border-border/30 p-1.5 cursor-pointer hover:bg-card/40 overflow-hidden ${
                    !inMonth ? "bg-muted/20" : ""
                  }`}
                  onClick={() => openSlot(day, 9 * 60, 10 * 60)}
                >
                  <div className={`text-xs mb-1 ${isToday ? "text-foreground font-medium" : inMonth ? "text-foreground/70" : "text-muted-foreground/40"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => handleTaskClick(e, t)}
                        className={`text-[10px] font-light truncate px-1 py-0.5 rounded-sm border-l-2 ${colorClasses(t.color)}`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New task dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => { if (!o) { setSelectedSlot(null); setNewTitle(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">
              {selectedSlot && format(selectedSlot.date, "d MMMM yyyy", { locale: tr })}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Saat aralığı, tip ve renk seç
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Type toggle */}
            <div className="flex border border-border/60 rounded-sm overflow-hidden text-xs">
              <button
                onClick={() => setNewKind("task")}
                className={`flex-1 px-2 py-1.5 ${newKind === "task" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                Görev
              </button>
              <button
                onClick={() => setNewKind("timebox")}
                className={`flex-1 px-2 py-1.5 flex items-center justify-center gap-1 ${newKind === "timebox" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                <Timer className="h-3 w-3" /> Time-box
              </button>
            </div>

            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={newKind === "timebox" ? "Time-box başlığı (ör: Derin çalışma)" : "Görev başlığı..."}
              className="bg-transparent h-9 text-sm"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent h-8 text-xs" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
                <Input type="time" value={endTime} min={startTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent h-8 text-xs" />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5 tracking-wide">Renk</div>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>

            <Button variant="ghost" size="sm" onClick={handleCreate} className="w-full h-9">
              <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TaskEditDialog
        task={editTask}
        projectId={projectId}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
        tasksOverride={tasks}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onCreateTask={createTask}
      />
    </div>
  );
};

export default WeeklyCalendarView;
