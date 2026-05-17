import { useMemo, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  parseISO,
} from "date-fns";
import { tr } from "date-fns/locale";

type DragState = {
  taskId: string;
  type: "move" | "resize-left" | "resize-right";
  startX: number;
  originalStart: string;
  originalEnd: string;
};

const GanttView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, updateTask } = useTasks(projectId);
  const [viewDate, setViewDate] = useState(new Date());
  const [mode, setMode] = useState<"week" | "month">("month");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(viewDate, { weekStartsOn: 1 });
      const end = endOfWeek(viewDate, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    }
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [viewDate, mode]);

  const navigate = (dir: number) => {
    setViewDate(mode === "week" ? addDays(viewDate, dir * 7) : addMonths(viewDate, dir));
  };

  const tasksWithDates = tasks.filter((t) => t.start_date && t.end_date);

  const getDayWidth = useCallback(() => {
    if (!containerRef.current) return 0;
    const taskAreaWidth = containerRef.current.offsetWidth - 160; // subtract label column
    return taskAreaWidth / range.days.length;
  }, [range.days.length]);

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: DragState["type"], startDate: string, endDate: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ taskId, type, startX: e.clientX, originalStart: startDate, originalEnd: endDate });
    setDragDelta(0);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const delta = e.clientX - dragState.startX;
    setDragDelta(delta);
  }, [dragState]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    const dayWidth = getDayWidth();
    if (dayWidth === 0) { setDragState(null); return; }

    const daysDelta = Math.round(dragDelta / dayWidth);
    if (daysDelta === 0) { setDragState(null); setDragDelta(0); return; }

    const origStart = parseISO(dragState.originalStart);
    const origEnd = parseISO(dragState.originalEnd);

    let newStart: Date, newEnd: Date;

    if (dragState.type === "move") {
      newStart = addDays(origStart, daysDelta);
      newEnd = addDays(origEnd, daysDelta);
    } else if (dragState.type === "resize-left") {
      newStart = addDays(origStart, daysDelta);
      newEnd = origEnd;
      if (newStart > newEnd) newStart = newEnd;
    } else {
      newStart = origStart;
      newEnd = addDays(origEnd, daysDelta);
      if (newEnd < newStart) newEnd = newStart;
    }

    await updateTask(dragState.taskId, {
      start_date: format(newStart, "yyyy-MM-dd"),
      end_date: format(newEnd, "yyyy-MM-dd"),
    });

    setDragState(null);
    setDragDelta(0);
  }, [dragState, dragDelta, getDayWidth, updateTask]);

  const getBarStyle = (taskId: string, taskStart: Date, taskEnd: Date) => {
    const totalDays = range.days.length;
    let startOffset = differenceInDays(taskStart, range.start);
    let endOffset = differenceInDays(taskEnd, range.start);

    if (dragState?.taskId === taskId) {
      const dayWidth = getDayWidth();
      const daysDelta = dayWidth > 0 ? Math.round(dragDelta / dayWidth) : 0;

      if (dragState.type === "move") {
        startOffset += daysDelta;
        endOffset += daysDelta;
      } else if (dragState.type === "resize-left") {
        startOffset += daysDelta;
        if (startOffset > endOffset) startOffset = endOffset;
      } else {
        endOffset += daysDelta;
        if (endOffset < startOffset) endOffset = startOffset;
      }
    }

    const clampedStart = Math.max(0, startOffset);
    const clampedEnd = Math.min(totalDays - 1, endOffset);
    const barWidth = Math.max(0, clampedEnd - clampedStart + 1);

    return {
      left: `${(clampedStart / totalDays) * 100}%`,
      width: `${(barWidth / totalDays) * 100}%`,
      isVisible: barWidth > 0 && clampedStart < totalDays,
    };
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">ガント — Gantt</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMode(mode === "week" ? "month" : "week")} className="text-xs">
            {mode === "week" ? "Aylık" : "Haftalık"}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">
            {format(viewDate, mode === "week" ? "d MMM yyyy" : "MMMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Tarih aralığı olan görev yok</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="border border-border/60 rounded-sm overflow-x-auto select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Header */}
          <div className="flex border-b border-border/60 min-w-[600px]">
            <div className="w-40 shrink-0 p-2 text-xs text-muted-foreground tracking-wide">Görev</div>
            <div className="flex-1 flex">
              {range.days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-1 text-center text-[10px] text-muted-foreground p-1 border-l border-border/30"
                >
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {tasksWithDates.map((task) => {
            const taskStart = parseISO(task.start_date!);
            const taskEnd = parseISO(task.end_date!);
            const bar = getBarStyle(task.id, taskStart, taskEnd);

            return (
              <div key={task.id} className="flex border-b border-border/30 min-w-[600px] hover:bg-card/50">
                <div className="w-40 shrink-0 p-2 text-xs font-light truncate">{task.title}</div>
                <div className="flex-1 relative h-8">
                  {bar.isVisible && (
                    <div
                      className="absolute top-1.5 h-5 rounded-sm bg-foreground/15 border border-border/40 group flex items-center"
                      style={{ left: bar.left, width: bar.width }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-foreground/20 rounded-l-sm"
                        onMouseDown={(e) => handleMouseDown(e, task.id, "resize-left", task.start_date!, task.end_date!)}
                      />
                      {/* Move handle (center) */}
                      <div
                        className="flex-1 h-full cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => handleMouseDown(e, task.id, "move", task.start_date!, task.end_date!)}
                      />
                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-foreground/20 rounded-r-sm"
                        onMouseDown={(e) => handleMouseDown(e, task.id, "resize-right", task.start_date!, task.end_date!)}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GanttView;
