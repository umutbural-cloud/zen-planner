import { type PointerEvent, useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, GripVertical, EyeOff, Eye, ChevronDown, ChevronRight, Filter, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasks, Task } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import TaskEditDialog from "./TaskEditDialog";
import { DelayedLoading, LoadingBlock } from "@/components/ui/delayed-loading";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type StatusFilter = "all" | "active" | "done";

const TASK_SWIPE_ACTION_WIDTH = 72;
const TASK_SWIPE_INTENT_THRESHOLD = 10;

type TaskSwipeDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  intent: "pending" | "horizontal" | "vertical";
};

type TableViewProps = {
  projectId: string;
  showHeader?: boolean;
};

const clampTaskSwipe = (value: number) => Math.max(-TASK_SWIPE_ACTION_WIDTH, Math.min(0, value));

const MobileSortableTaskCard = ({ task, subtasks, onUpdate, onDelete, onOpen, categoryDot, openSwipeTaskId, onOpenSwipeTaskChange }: {
  task: Task;
  subtasks: Task[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  categoryDot?: string;
  openSwipeTaskId: string | null;
  onOpenSwipeTaskChange: (id: string | null) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [expanded, setExpanded] = useState(false);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<TaskSwipeDragState | null>(null);
  const suppressClickRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isSwipeDragging, setIsSwipeDragging] = useState(false);
  const isSwipeOpen = openSwipeTaskId === task.id;
  const openOffset = isSwipeOpen ? -TASK_SWIPE_ACTION_WIDTH : 0;
  const currentSwipeOffset = isSwipeDragging ? dragX : openOffset;
  const deleteVisible = currentSwipeOffset < 0 || isSwipeOpen;
  const deleteActionEnabled = isSwipeOpen;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const capturePointer = (event: PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not guaranteed on every browser/input combination.
    }
  };

  const releasePointer = (pointerId: number) => {
    try {
      swipeRef.current?.releasePointerCapture(pointerId);
    } catch {
      // Pointer cancel can arrive after the browser has already released capture.
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (openSwipeTaskId && openSwipeTaskId !== task.id) onOpenSwipeTaskChange(null);
    capturePointer(event);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: openOffset,
      intent: "pending",
    };
    setDragX(openOffset);
    setIsSwipeDragging(false);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.intent === "pending") {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absY > absX && absY > TASK_SWIPE_INTENT_THRESHOLD) {
        drag.intent = "vertical";
        setIsSwipeDragging(false);
        return;
      }
      if (absX < TASK_SWIPE_INTENT_THRESHOLD) return;
      drag.intent = "horizontal";
      suppressClickRef.current = true;
      setIsSwipeDragging(true);
    }

    if (drag.intent !== "horizontal") return;
    setDragX(clampTaskSwipe(drag.startOffset + deltaX));
  };

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    releasePointer(event.pointerId);
    dragRef.current = null;
    setIsSwipeDragging(false);

    if (drag.intent !== "horizontal") {
      setDragX(0);
      return;
    }

    const finalX = clampTaskSwipe(drag.startOffset + event.clientX - drag.startX);
    onOpenSwipeTaskChange(finalX <= -TASK_SWIPE_ACTION_WIDTH ? task.id : null);
    setDragX(0);
  };

  const cancelSwipe = (event: PointerEvent<HTMLDivElement>) => {
    releasePointer(event.pointerId);
    dragRef.current = null;
    setIsSwipeDragging(false);
    setDragX(0);
  };

  const closeSwipe = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest(`[data-task-swipe-action="${task.id}"]`)) {
      activeElement.blur();
    }
    onOpenSwipeTaskChange(null);
  };

  const handleOpenTask = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isSwipeOpen) {
      onOpenSwipeTaskChange(null);
      return;
    }
    onOpen(task);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-[1.35rem] ${
        isDragging ? "z-10" : ""
      }`}
    >
      <div
        data-task-swipe-action={task.id}
        className={`absolute inset-y-0 right-0 flex w-[72px] items-stretch justify-center ${
          deleteVisible ? "bg-destructive" : ""
        }`}
      >
        <button
          type="button"
          aria-label="Görevi sil"
          disabled={!deleteActionEnabled}
          tabIndex={deleteActionEnabled ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            closeSwipe();
            onDelete(task.id);
          }}
          className={`flex w-[72px] shrink-0 items-center justify-center text-destructive-foreground transition-opacity ${
            deleteActionEnabled ? "pointer-events-auto hover:bg-destructive/90" : "pointer-events-none"
          } ${
            deleteVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={swipeRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={cancelSwipe}
        onLostPointerCapture={cancelSwipe}
        className={`relative z-10 overflow-hidden rounded-[1.35rem] border border-border/55 bg-card/70 px-4 pb-4 pt-4 shadow-[0_8px_28px_-24px_hsl(var(--foreground))] transition-colors active:bg-accent/25 ${
          isDragging ? "border-primary/35 bg-card/85 shadow-md" : ""
        } ${isSwipeDragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${currentSwipeOffset}px)`, touchAction: "pan-y" }}
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" aria-hidden="true" />
        <span
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-2.5 top-2.5"
        >
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex min-h-11 min-w-11 touch-none cursor-grab items-center justify-center rounded-2xl border border-border/40 bg-background/55 text-muted-foreground/60 transition-colors active:cursor-grabbing active:bg-accent/60 active:text-foreground"
            aria-label="Görevi sürükle"
            title="Sürükle"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </span>

        <div
          role="button"
          tabIndex={0}
          onClick={handleOpenTask}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (isSwipeOpen) {
                onOpenSwipeTaskChange(null);
                return;
              }
              onOpen(task);
            }
          }}
          className="block w-full pr-12 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex shrink-0 items-center gap-1">
              <span
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-2xl bg-background/55"
              >
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={(checked) => {
                    onOpenSwipeTaskChange(null);
                    onUpdate(task.id, { status: checked ? "done" : "todo" });
                  }}
                  className="h-5 w-5"
                />
              </span>
              {subtasks.length > 0 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenSwipeTaskChange(null);
                    setExpanded((current) => !current);
                  }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                  aria-expanded={expanded}
                  aria-label={expanded ? "Alt görevleri kapat" : "Alt görevleri aç"}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className={`block break-words text-[1rem] leading-6 tracking-[-0.01em] text-foreground ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                {task.title}
              </span>
              {categoryDot && (
                <span className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryDot }} />
                    Etiket
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded && subtasks.length > 0 && (
          <div className="mt-2 rounded-lg bg-muted/20 px-2 py-2">
            <div className="space-y-1">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSwipeTaskChange(null);
                    onOpen(subtask);
                  }}
                >
                  <Checkbox
                    checked={subtask.status === "done"}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={(checked) => {
                      onOpenSwipeTaskChange(null);
                      onUpdate(subtask.id, { status: checked ? "done" : "todo" });
                    }}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className={`min-w-0 flex-1 break-words font-light ${subtask.status === "done" ? "text-muted-foreground/70 line-through" : "text-foreground"}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

const SortableRow = ({ task, subtasks, onUpdate, onDelete, onToggleHidden, onOpen, categoryDot }: {
  task: Task;
  subtasks: Task[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  onOpen: (task: Task) => void;
  categoryDot?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [title, setTitle] = useState(task.title);
  const focusedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!focusedRef.current) setTitle(task.title);
  }, [task.title]);

  const flush = (val: string) => {
    if (val !== task.title) onUpdate(task.id, { title: val });
  };

  const handleChange = (v: string) => {
    setTitle(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => flush(v), 500);
  };

  const handleRowClick = () => {
    if (subtasks.length === 0) onOpen(task);
  };

  const handleRowDoubleClick = () => {
    if (subtasks.length > 0) setExpanded((current) => !current);
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="group cursor-pointer"
      onClick={handleRowClick}
      onDoubleClick={handleRowDoubleClick}
    >
      <TableCell colSpan={4} className="!p-0 sm:!p-0">
        <div className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_6rem]">
          <div className="flex h-[60px] min-h-[60px] items-center px-1 sm:px-2" onClick={(e) => e.stopPropagation()}>
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex h-[60px] min-h-[60px] items-center px-1 sm:px-2" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={(checked) => onUpdate(task.id, { status: checked ? "done" : "todo" })}
            />
          </div>
          <div className="flex h-[60px] min-h-[60px] min-w-0 items-center gap-1.5 px-1 text-sm font-light sm:px-2">
            {subtasks.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-muted-foreground/60 hover:text-foreground"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {categoryDot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryDot }} />}
            <Input
              value={title}
              onClick={(e) => e.stopPropagation()}
              onFocus={() => { focusedRef.current = true; }}
              onBlur={() => {
                focusedRef.current = false;
                if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
                flush(title);
              }}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 border-none bg-transparent p-0 text-sm font-light focus-visible:ring-0"
            />
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {subtasks.filter((s) => s.status === "done").length}/{subtasks.length}
              </span>
            )}
          </div>
          <div className="flex h-[60px] min-h-[60px] items-center justify-end gap-1 px-1 text-right transition-opacity sm:px-2 sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onOpen(task)}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Düzenle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onToggleHidden(task.id, !task.hidden)}
              className="text-muted-foreground hover:text-foreground p-1"
              title={task.hidden ? "Göster" : "Gizle"}
            >
              {task.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="text-muted-foreground hover:text-destructive p-1"
              title="Sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {expanded && subtasks.length > 0 && (
            <div className="col-start-3 col-span-2 -mt-1 mb-1 space-y-0.5 pr-2">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="group/subtask flex min-h-6 items-center gap-2 rounded-sm px-1 py-0 text-sm leading-5 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(s);
                  }}
                >
                  <Checkbox
                    checked={s.status === "done"}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(c) => onUpdate(s.id, { status: c ? "done" : "todo" })}
                    className="h-3.5 w-3.5"
                  />
                  <span className={`min-w-0 flex-1 truncate font-light ${s.status === "done" ? "line-through text-muted-foreground/70" : ""}`}>
                    {s.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="p-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover/subtask:opacity-100"
                    title="Sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

const TableView = ({ projectId, showHeader = true }: TableViewProps) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const isMobile = useIsMobile();
  const [newTitle, setNewTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [openSwipeTaskId, setOpenSwipeTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim() });
    setNewTitle("");
  };

  // Top-level (non-subtask) tasks
  const topLevel = useMemo(() => tasks.filter((t) => !t.parent_block_id), [tasks]);
  const subtasksOf = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (t.parent_block_id) {
        const arr = map.get(t.parent_block_id) || [];
        arr.push(t);
        map.set(t.parent_block_id, arr);
      }
    });
    return map;
  }, [tasks]);

  const matchesFilters = (t: Task) => {
    if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
    return true;
  };

  const visible = topLevel.filter((t) => !t.hidden && t.status !== "done" && matchesFilters(t) && (statusFilter === "all" || statusFilter === "active"));
  const doneTasks = topLevel
    .filter((t) => !t.hidden && t.status === "done" && matchesFilters(t) && (statusFilter === "all" || statusFilter === "done"))
    .sort((a, b) => {
      const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return tb - ta;
    });
  const hiddenTasks = topLevel.filter((t) => t.hidden);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visible.map((t) => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(visible, oldIndex, newIndex);
    const finalOrder = [
      ...newOrder,
      ...tasks.filter((t) => !newOrder.find((n) => n.id === t.id)),
    ];
    reorderTasks(finalOrder.map((t) => t.id));
  };

  const categoryDotOf = (t: Task) => {
    const cid = t.category_id;
    if (!cid) return undefined;
    const c = categories.find((x) => x.id === cid);
    return c ? colorHex(c.color) : undefined;
  };

  const filterActive = statusFilter !== "all" || categoryFilter !== "all";
  const activeCategory = categories.find((c) => c.id === categoryFilter);

  if (loading) {
    return (
      <DelayedLoading
        loading
        delay={300}
        fallback={(
          <div className="space-y-2.5 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
              <span>Yükleniyor</span>
            </div>
            <div className="flex items-center gap-2">
              <LoadingBlock lines={1} className="flex-1 max-w-[16rem]" />
              <div className="h-8 w-8 rounded-md bg-muted/70 animate-pulse" />
            </div>
            <div className="rounded-sm border border-border/50 bg-card/20 px-2.5 py-2">
              <LoadingBlock lines={1} className="max-w-[12rem]" />
            </div>
          </div>
        )}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 md:space-y-4">
      {showHeader && (
        <h2 className="text-lg tracking-wide font-light">Tablo</h2>
      )}

      <div className="rounded-[1.35rem] border border-border/45 bg-card/40 p-2.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <div className="flex flex-wrap gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Yeni görev..."
          className="min-w-full bg-background/70 text-base md:h-9 md:min-w-0 md:bg-transparent md:text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="px-4 md:h-9 md:px-3">
          <Plus className="h-3.5 w-3.5" />
          <span className="md:hidden">Ekle</span>
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={`px-3 md:h-9 md:px-2 ${filterActive ? "text-foreground" : "text-muted-foreground"}`} title="Filtre">
              <Filter className="h-3.5 w-3.5" />
              {filterActive && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1.5 px-1">Durum</div>
            <div className="space-y-0.5 mb-3">
              {([
                { v: "all", l: "Hepsi" },
                { v: "active", l: "Aktif" },
                { v: "done", l: "Tamamlanan" },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setStatusFilter(opt.v as StatusFilter)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                >
                  <span className="flex-1 text-left">{opt.l}</span>
                  {statusFilter === opt.v && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>

            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1.5 px-1">Kategori</div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              <button
                onClick={() => setCategoryFilter("all")}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="flex-1 text-left">Hepsi</span>
                {categoryFilter === "all" && <Check className="h-3 w-3" />}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: colorHex(c.color) }} />
                  <span className="flex-1 text-left">{c.name}</span>
                  {categoryFilter === c.id && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {filterActive && (
        <div className="flex min-h-10 items-center gap-2 text-[10px] font-light tracking-wide text-muted-foreground/70 md:min-h-0">
          <span>Filtre:</span>
          {statusFilter !== "all" && <span className="px-1.5 py-0.5 rounded-sm bg-accent/50">{statusFilter === "active" ? "Aktif" : "Tamamlanan"}</span>}
          {activeCategory && <span className="px-1.5 py-0.5 rounded-sm bg-accent/50 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: colorHex(activeCategory.color) }} />{activeCategory.name}</span>}
          <button onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }} className="ml-auto hover:text-foreground">Temizle</button>
        </div>
      )}

      {visible.length === 0 && doneTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">Boş</p>
          <p className="text-xs">{filterActive ? "Filtreye uygun görev yok" : "Aktif görev yok"}</p>
        </div>
      ) : visible.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {isMobile ? (
              <div className="space-y-3.5">
                {visible.map((task) => (
                  <MobileSortableTaskCard
                    key={task.id}
                    task={task}
                    subtasks={subtasksOf.get(task.id) || []}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onOpen={setEditTask}
                    categoryDot={categoryDotOf(task)}
                    openSwipeTaskId={openSwipeTaskId}
                    onOpenSwipeTaskChange={setOpenSwipeTaskId}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/35 md:rounded-sm md:bg-transparent">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs font-light tracking-wide">Başlık</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {visible.map((task) => (
                    <SortableRow
                      key={task.id}
                      task={task}
                      subtasks={subtasksOf.get(task.id) || []}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onToggleHidden={(id, hidden) => updateTask(id, { hidden })}
                      onOpen={setEditTask}
                      categoryDot={categoryDotOf(task)}
                    />
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      {/* Tamamlananlar */}
      {doneTasks.length > 0 && (() => {
        const visibleDone = showDone ? doneTasks : doneTasks.slice(0, 3);
        const hiddenCount = Math.max(0, doneTasks.length - 3);
        return (
          <div className="overflow-hidden rounded-[1.35rem] border border-border/55 bg-card/40 md:rounded-sm md:bg-transparent">
            <div className="flex min-h-10 items-center gap-2 bg-card/35 px-3.5 py-2 text-xs text-muted-foreground md:min-h-0 md:px-3">
              <span className="tracking-wide">Tamamlananlar</span>
              <span className="text-muted-foreground/60">{doneTasks.length}</span>
            </div>
            <Table>
              <TableBody>
                {visibleDone.map((task) => (
                  <TableRow key={task.id} className="group h-[42px] cursor-pointer md:h-auto" onClick={() => setEditTask(task)}>
                    <TableCell className="w-11 py-1.5 pl-3 pr-2 md:w-10 md:px-2 md:py-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked
                        onCheckedChange={() => updateTask(task.id, { status: "todo" })}
                      />
                    </TableCell>
                    <TableCell className="break-words py-1.5 pl-0 pr-2 text-sm font-light text-muted-foreground line-through md:px-2 md:py-1">{task.title}</TableCell>
                    <TableCell className="whitespace-nowrap py-1.5 pl-2 pr-3 text-right text-[10px] font-light text-muted-foreground/70 md:px-2 md:py-1 sm:text-[11px]">
                      {task.completed_at
                        ? format(parseISO(task.completed_at), "d MMM HH:mm", { locale: tr })
                        : "—"}
                    </TableCell>
                    <TableCell className="w-10 px-1 py-1 text-right sm:w-12 sm:px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="hidden min-h-10 min-w-10 rounded-lg p-2 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 md:inline-flex md:min-h-0 md:min-w-0 md:rounded-sm md:p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowDone(!showDone)}
                className="w-full border-t border-border/40 py-2.5 text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground md:py-2"
              >
                {showDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenCount} tane daha göster`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Gizlenenler */}
      {hiddenTasks.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/35 md:rounded-sm md:bg-transparent">
          <button
            type="button"
            onClick={() => setShowHidden(!showHidden)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-card/40 md:min-h-0"
          >
            {showHidden ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="tracking-wide">Gizlenenler</span>
            <span className="text-muted-foreground/60">{hiddenTasks.length}</span>
          </button>
          {showHidden && (
            <Table>
              <TableBody>
                {hiddenTasks.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell className="text-sm font-light text-muted-foreground italic px-2 py-1 break-words">{task.title}</TableCell>
                    <TableCell className="w-20 sm:w-24 text-right px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { hidden: false })}
                        className="text-muted-foreground hover:text-foreground text-[10px] tracking-wide"
                      >
                        Göster
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

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

export default TableView;
