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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const SLOT_HEIGHT = 44; // px per hour slot

type Mode = "week" | "month";
type SlotInfo = { date: Date; startHour: number; endHour: number };

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
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<TaskColor>("gray");
  const [newKind, setNewKind] = useState<TaskKind>("task");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [editDraft, setEditDraft] = useState<Task | null>(null);

  // Drag-to-create state (mouse + touch)
  const [dragging, setDragging] = useState<{ day: Date; startHour: number; currentHour: number } | null>(null);
  const dragRef = useRef<{ day: Date; startHour: number; moved: boolean } | null>(null);

  // Move-existing-block state
  const [movingTask, setMovingTask] = useState<{ id: string; day: Date; hour: number; durationHrs: number } | null>(null);
  const moveRef = useRef<{ id: string; durationHrs: number; pointerOffsetHrs: number; lastDay: Date; lastHour: number; moved: boolean } | null>(null);

  const days = useMemo(() => {
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

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => {
      if (t.start_date && t.end_date) {
        return isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
      }
      if (t.start_date) return isSameDay(day, parseISO(t.start_date));
      return false;
    });

  const navigate = (dir: number) => {
    setCurrent(mode === "week" ? addWeeks(current, dir) : addMonths(current, dir));
  };

  const openSlot = (date: Date, startHour: number, endHour: number) => {
    setSelectedSlot({ date, startHour, endHour });
    setStartTime(`${String(startHour).padStart(2, "0")}:00`);
    setEndTime(`${String(endHour).padStart(2, "0")}:00`);
    setNewTitle("");
    setNewColor("gray");
    setNewKind("task");
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedSlot) return;
    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");
    await createTask({
      title: newTitle.trim(),
      start_date: dateStr,
      end_date: dateStr,
      start_time: startTime,
      end_time: endTime,
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
    dragRef.current = { day, startHour: hour, moved: false };
    setDragging({ day, startHour: hour, currentHour: hour });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Moving existing block?
    if (moveRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
      if (!slot) return;
      const [dayStr, hourStr] = slot.dataset.slotKey!.split("|");
      const day = parseISO(dayStr);
      const hour = parseInt(hourStr, 10);
      moveRef.current.moved = true;
      moveRef.current.lastDay = day;
      moveRef.current.lastHour = hour;
      setMovingTask({ id: moveRef.current.id, day, hour, durationHrs: moveRef.current.durationHrs });
      return;
    }

    if (!dragRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
    if (!slot) return;
    const key = slot.dataset.slotKey!;
    const [dayStr, hourStr] = key.split("|");
    if (dayStr !== format(dragRef.current.day, "yyyy-MM-dd")) return;
    const hour = parseInt(hourStr, 10);
    if (hour !== dragging?.currentHour) {
      dragRef.current.moved = true;
      setDragging((d) => (d ? { ...d, currentHour: hour } : null));
    }
  };

  const handlePointerUp = () => {
    // Finish moving existing block
    if (moveRef.current) {
      const m = moveRef.current;
      if (m.moved) {
        const newStartH = Math.max(0, Math.min(23, m.lastHour));
        const newEndH = Math.min(24, newStartH + Math.max(1, Math.round(m.durationHrs)));
        const dateStr = format(m.lastDay, "yyyy-MM-dd");
        updateTask(m.id, {
          start_date: dateStr,
          end_date: dateStr,
          start_time: `${String(newStartH).padStart(2, "0")}:00`,
          end_time: `${String(newEndH).padStart(2, "0")}:00`,
        });
      }
      moveRef.current = null;
      setMovingTask(null);
      return;
    }

    if (dragging && dragRef.current) {
      const startHour = Math.min(dragging.startHour, dragging.currentHour);
      const endHour = Math.max(dragging.startHour, dragging.currentHour) + 1;
      openSlot(dragging.day, startHour, endHour);
    }
    dragRef.current = null;
    setDragging(null);
  };

  const startMoveTask = (e: React.PointerEvent, t: Task) => {
    if (!t.start_time || !t.start_date) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const [sh] = t.start_time.split(":").map(Number);
    const [eh] = (t.end_time || t.start_time).split(":").map(Number);
    const dur = Math.max(1, eh - sh);
    moveRef.current = {
      id: t.id, durationHrs: dur, pointerOffsetHrs: 0,
      lastDay: parseISO(t.start_date), lastHour: sh, moved: false,
    };
    setMovingTask({ id: t.id, day: parseISO(t.start_date), hour: sh, durationHrs: dur });
  };

  // Helper: a click handler for task block — only opens dialog if drag did NOT happen
  const handleTaskClick = (e: React.MouseEvent, t: Task) => {
    e.stopPropagation();
    if (moveRef.current?.moved) return;
    setOpenTask(t);
    setEditDraft(t);
  };

  // Cancel any stuck drag if pointer leaves the page
  useEffect(() => {
    const cancel = () => { dragRef.current = null; setDragging(null); moveRef.current = null; setMovingTask(null); };
    window.addEventListener("pointercancel", cancel);
    return () => window.removeEventListener("pointercancel", cancel);
  }, []);

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  // Helper: time-box blocks render as a faded background spanning slots
  const isTimebox = (t: Task) => t.kind === "timebox";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg tracking-wide">
          {mode === "week" ? "週 — Hafta" : "月 — Ay"}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-border/60 rounded-sm overflow-hidden">
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
            {mode === "week"
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

      {mode === "week" ? (
        <div
          className="border border-border/60 rounded-sm overflow-hidden select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Day headers */}
          <div className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 bg-card/30">
            <div />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className="text-center p-2 border-l border-border/30">
                  <div className="text-[10px] text-muted-foreground tracking-wide">{weekDays[i]}</div>
                  <div className={`text-sm mt-0.5 ${isToday ? "text-foreground font-medium" : "text-muted-foreground font-light"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day row */}
          <div className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 min-h-[40px]">
            <div className="text-[9px] text-muted-foreground p-1.5 tracking-wide">tüm gün</div>
            {days.map((day, i) => {
              const dayTasks = getTasksForDay(day).filter((t) => !t.start_time);
              return (
                <div
                  key={i}
                  className="border-l border-border/30 p-1 space-y-0.5 cursor-pointer hover:bg-card/40"
                  onClick={() => openSlot(day, 9, 10)}
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
              <div key={hour} className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/30" style={{ minHeight: SLOT_HEIGHT }}>
                <div className="text-[10px] text-muted-foreground p-1.5 tracking-wide">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map((day, i) => {
                  const isDraggingThis =
                    dragging && isSameDay(dragging.day, day) &&
                    hour >= Math.min(dragging.startHour, dragging.currentHour) &&
                    hour <= Math.max(dragging.startHour, dragging.currentHour);
                  const timedTasks = tasks.filter((t) => {
                    if (!t.start_date || !t.start_time) return false;
                    if (!isSameDay(parseISO(t.start_date), day)) return false;
                    return parseInt(t.start_time.slice(0, 2)) === hour;
                  });
                  // Pomodoro sessions starting in this hour, for this day
                  const hourSessions = sessions.filter((s) => {
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
                      {/* Timeboxes (background, full width, lower z) */}
                      {timedTasks.filter(isTimebox).map((t) => {
                        const [sh, sm] = t.start_time!.split(":").map(Number);
                        const [eh, em] = (t.end_time || t.start_time!).split(":").map(Number);
                        const heightHrs = Math.max(0.5, (eh + em / 60) - (sh + sm / 60));
                        return (
                          <div
                            key={t.id}
                            onPointerDown={(e) => startMoveTask(e, t)}
                            onClick={(e) => handleTaskClick(e, t)}
                            title={t.title}
                            className={`absolute inset-x-0 px-1.5 py-1 rounded-sm border border-dashed text-[10px] font-light cursor-grab active:cursor-grabbing z-0 ${colorClasses(t.color)}`}
                            style={{ top: 1, height: `${heightHrs * SLOT_HEIGHT - 2}px`, opacity: 0.55 }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <Timer className="h-2.5 w-2.5 opacity-70 shrink-0" />
                              <span className="truncate">{t.title}</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Regular tasks (left-aligned, leave room on right for pomodoro/timebox edge) */}
                      {timedTasks.filter((t) => !isTimebox(t)).map((t) => {
                        const [sh, sm] = t.start_time!.split(":").map(Number);
                        const [eh, em] = (t.end_time || t.start_time!).split(":").map(Number);
                        const heightHrs = Math.max(0.5, (eh + em / 60) - (sh + sm / 60));
                        return (
                          <div
                            key={t.id}
                            onPointerDown={(e) => startMoveTask(e, t)}
                            onClick={(e) => handleTaskClick(e, t)}
                            className={`absolute left-0.5 px-1.5 py-1 rounded-sm border-l-2 text-[10px] font-light truncate cursor-grab active:cursor-grabbing z-10 ${colorClasses(t.color)}`}
                            style={{ top: 1, right: "28%", height: `${heightHrs * SLOT_HEIGHT - 2}px` }}
                          >
                            <div className="truncate">{t.title}</div>
                            <div className="text-[9px] opacity-70">{t.start_time?.slice(0,5)}{t.end_time && `–${t.end_time.slice(0,5)}`}</div>
                          </div>
                        );
                      })}

                      {/* Move ghost */}
                      {movingTask && isSameDay(movingTask.day, day) && movingTask.hour === hour && (
                        <div
                          className="absolute inset-x-0 rounded-sm border border-dashed border-foreground/50 bg-foreground/10 z-20 pointer-events-none"
                          style={{ top: 1, height: `${movingTask.durationHrs * SLOT_HEIGHT - 2}px` }}
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
                  onClick={() => openSlot(day, 9, 10)}
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

      {/* Task detail dialog — explicit Save */}
      <Dialog
        open={!!openTask}
        onOpenChange={(o) => {
          if (!o) { setOpenTask(null); setEditDraft(null); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">
              {editDraft?.kind === "timebox" ? "Time-box düzenle" : "Görev düzenle"}
            </DialogTitle>
            <DialogDescription className="sr-only">Görevi düzenleyin veya silin</DialogDescription>
          </DialogHeader>
          {editDraft && openTask && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {editDraft.kind === "timebox" && <Timer className="h-4 w-4 text-muted-foreground" />}
                <Input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                  className="bg-transparent border-none p-0 h-auto text-lg font-light tracking-wide focus-visible:ring-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
                  <Input
                    type="date"
                    value={editDraft.start_date || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next: any = { ...editDraft, start_date: v || null };
                      if (v && editDraft.end_date && v > editDraft.end_date) next.end_date = v;
                      setEditDraft(next);
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
                  <Input
                    type="date"
                    value={editDraft.end_date || ""}
                    min={editDraft.start_date || undefined}
                    onChange={(e) => setEditDraft({ ...editDraft, end_date: e.target.value || null })}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç saati</div>
                  <Input
                    type="time"
                    value={editDraft.start_time?.slice(0,5) || ""}
                    onChange={(e) => setEditDraft({ ...editDraft, start_time: e.target.value || null })}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş saati</div>
                  <Input
                    type="time"
                    value={editDraft.end_time?.slice(0,5) || ""}
                    min={editDraft.start_time?.slice(0,5)}
                    onChange={(e) => setEditDraft({ ...editDraft, end_time: e.target.value || null })}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground mb-1.5 tracking-wide">Renk</div>
                <ColorPicker
                  value={(editDraft.color || "gray") as TaskColor}
                  onChange={(c) => setEditDraft({ ...editDraft, color: c })}
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { deleteTask(openTask.id); setOpenTask(null); setEditDraft(null); }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setOpenTask(null); setEditDraft(null); }}
                  >
                    İptal
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTask(openTask.id, {
                        title: editDraft.title,
                        start_date: editDraft.start_date,
                        end_date: editDraft.end_date,
                        start_time: editDraft.start_time,
                        end_time: editDraft.end_time,
                        color: editDraft.color,
                      });
                      setOpenTask(null);
                      setEditDraft(null);
                    }}
                  >
                    Kaydet
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyCalendarView;
