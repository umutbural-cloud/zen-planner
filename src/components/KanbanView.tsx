import { useState } from "react";
import { Plus, GripVertical, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import TaskEditDialog from "./TaskEditDialog";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

const COLUMNS: { key: TaskStatus; label: string; jpLabel: string }[] = [
  { key: "todo", label: "Yapılacak", jpLabel: "未" },
  { key: "in_progress", label: "Devam Eden", jpLabel: "進" },
  { key: "done", label: "Tamamlandı", jpLabel: "了" },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: "in_progress",
  in_progress: "done",
  done: null,
};

const SortableCard = ({ task, subtasks, onUpdate, onOpen, categoryDot }: {
  task: Task;
  subtasks: Task[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onOpen: (task: Task) => void;
  categoryDot?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = NEXT_STATUS[task.status];
    if (next) onUpdate(task.id, { status: next });
  };

  const canAdvance = NEXT_STATUS[task.status] !== null;
  const doneCount = subtasks.filter((s) => s.status === "done").length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpen(task)}
      className="group border border-border/60 rounded-sm p-3 bg-card/50 hover:bg-card transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {subtasks.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="text-muted-foreground/60 hover:text-foreground shrink-0"
                title={expanded ? "Alt görevleri gizle" : "Alt görevleri göster"}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {categoryDot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryDot }} />}
            <p className="text-sm font-light truncate">{task.title}</p>
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          {(task.start_date || task.start_time) && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {task.start_date}{task.end_date && task.end_date !== task.start_date && ` → ${task.end_date}`}
              {task.start_time && ` · ${task.start_time.slice(0, 5)}${task.end_time ? `–${task.end_time.slice(0, 5)}` : ""}`}
            </p>
          )}
          {expanded && subtasks.length > 0 && (
            <div className="mt-2 pl-1 space-y-1 border-l border-border/60">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 pl-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={s.status === "done"}
                    onCheckedChange={(c) => onUpdate(s.id, { status: c ? "done" : "todo" })}
                    className="h-3 w-3"
                  />
                  <span className={`text-xs font-light flex-1 truncate ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {canAdvance && (
          <button
            onClick={handleAdvance}
            title="Sonraki aşamaya geçir"
            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 p-1 -m-1"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, tasks, subtasksOf, onCreateTask, onUpdateTask, onOpen, categoryDotOf }: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  subtasksOf: (id: string) => Task[];
  onCreateTask: (title: string, status: TaskStatus) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onOpen: (task: Task) => void;
  categoryDotOf: (t: Task) => string | undefined;
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const { setNodeRef } = useDroppable({ id: `column-${column.key}` });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onCreateTask(newTitle.trim(), column.key);
    setNewTitle("");
    setIsAdding(false);
  };

  const isDoneCol = column.key === "done";
  const sorted = isDoneCol
    ? [...tasks].sort((a, b) => {
        const aKey = a.completed_at || a.created_at;
        const bKey = b.completed_at || b.created_at;
        return bKey > aKey ? 1 : bKey < aKey ? -1 : 0;
      })
    : tasks;
  const visibleTasks = isDoneCol && !showAllDone ? sorted.slice(0, 3) : sorted;
  const hiddenCount = isDoneCol ? Math.max(0, sorted.length - 3) : 0;

  return (
    <div ref={setNodeRef} className="w-full sm:flex-1 sm:min-w-[240px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{column.jpLabel}</span>
          <h3 className="text-sm tracking-wide">{column.label}</h3>
          <span className="text-xs text-muted-foreground/60">{tasks.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAdding(true)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2 flex-1 min-h-[100px]">
        {isAdding && (
          <div className="border border-border/60 rounded-sm p-2 space-y-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
            }} placeholder="Görev adı..." className="bg-transparent h-7 text-sm" autoFocus />
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd}>Ekle</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setIsAdding(false); setNewTitle(""); }}>İptal</Button>
            </div>
          </div>
        )}
        <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <SortableCard key={task.id} task={task} subtasks={subtasksOf(task.id)} onUpdate={onUpdateTask} onOpen={onOpen} categoryDot={categoryDotOf(task)} />
          ))}
        </SortableContext>
        {isDoneCol && hiddenCount > 0 && (
          <button
            onClick={() => setShowAllDone(!showAllDone)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 tracking-wide transition-colors"
          >
            {showAllDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenCount} tane daha göster`}
          </button>
        )}
      </div>
    </div>
  );
};

const KanbanView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, reorderTasks } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const categoryDotOf = (t: Task) => {
    const cid = (t as any).category_id;
    if (!cid) return undefined;
    const c = categories.find((x) => x.id === cid);
    return c ? colorHex(c.color) : undefined;
  };

  const topLevel = tasks.filter((t) => !t.parent_block_id);
  const subtasksOf = (parentId: string) => tasks.filter((t) => t.parent_block_id === parentId);

  const handleCreate = async (title: string, status: TaskStatus) => {
    await createTask({ title, status });
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let targetStatus: TaskStatus | null = null;
    let overTask: Task | undefined;

    if (overId.startsWith("column-")) {
      targetStatus = overId.replace("column-", "") as TaskStatus;
    } else {
      overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    // Status change
    if (activeTask.status !== targetStatus) {
      await updateTask(active.id as string, { status: targetStatus });
      return;
    }

    // Same column reorder
    if (overTask && active.id !== over.id) {
      const colTasks = tasks.filter((t) => t.status === targetStatus);
      const ids = colTasks.map((t) => t.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex >= 0 && newIndex >= 0) {
        const newOrder = arrayMove(colTasks, oldIndex, newIndex);
        const finalOrder = [
          ...newOrder,
          ...tasks.filter((t) => !newOrder.find((n) => n.id === t.id)),
        ];
        reorderTasks(finalOrder.map((t) => t.id));
      }
    }
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg tracking-wide font-light">看板 — Kanban</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              tasks={topLevel.filter((t) => t.status === col.key)}
              subtasksOf={subtasksOf}
              onCreateTask={handleCreate}
              onUpdateTask={updateTask}
              onOpen={setEditTask}
              categoryDotOf={categoryDotOf}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="border border-border rounded-sm p-3 bg-card shadow-lg cursor-grabbing">
              <div className="flex items-start gap-2">
                <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light truncate">{activeTask.title}</p>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activeTask.description}</p>
                  )}
                  {activeTask.start_date && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {activeTask.start_date}{activeTask.end_date && ` → ${activeTask.end_date}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskEditDialog
        task={editTask}
        projectId={projectId}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
    </div>
  );
};

export default KanbanView;
