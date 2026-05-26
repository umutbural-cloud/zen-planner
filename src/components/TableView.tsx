import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, GripVertical, EyeOff, Eye, ChevronDown, ChevronRight, Filter, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasks, Task } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
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
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={`group cursor-pointer ${expanded && subtasks.length > 0 ? "border-b-0" : ""}`}
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
      >
        <TableCell className="py-1 px-1 sm:px-2 w-7 sm:w-8" onClick={(e) => e.stopPropagation()}>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </TableCell>
        <TableCell className="py-1 px-1 sm:px-2 w-8 sm:w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={(checked) => onUpdate(task.id, { status: checked ? "done" : "todo" })}
          />
        </TableCell>
        <TableCell className="text-sm font-light px-1 sm:px-2 py-1">
          <div className="flex items-center gap-1.5">
            {subtasks.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
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
              className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
            />
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {subtasks.filter((s) => s.status === "done").length}/{subtasks.length}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="w-20 sm:w-24 px-1 sm:px-2 py-1 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
        </TableCell>
      </TableRow>

      {expanded && subtasks.length > 0 && (
        <TableRow className="bg-card/10 hover:bg-card/10">
          <TableCell colSpan={4} className="px-0 py-0">
            <div className="ml-[2.75rem] sm:ml-[3.25rem] mr-2 mb-1 border-l border-border/70 pl-2">
              <div className="space-y-0.5 py-0.5">
                {subtasks.map((s) => (
                  <div
                    key={s.id}
                    className="group/subtask flex min-h-7 items-center gap-2 rounded-sm px-1.5 py-0.5 text-sm hover:bg-accent/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(s);
                    }}
                  >
                    <span className="h-px w-2.5 shrink-0 bg-border/80" aria-hidden="true" />
                    <Checkbox
                      checked={s.status === "done"}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(c) => onUpdate(s.id, { status: c ? "done" : "todo" })}
                      className="h-3.5 w-3.5"
                    />
                    <span className={`min-w-0 flex-1 truncate text-xs font-light ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>
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
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const TableView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const [newTitle, setNewTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [editTask, setEditTask] = useState<Task | null>(null);

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
      <DelayedLoading loading delay={300} fallback={<div className="space-y-4 max-w-3xl mx-auto w-full">
        <div className="space-y-2">
          <LoadingBlock lines={2} className="max-w-[18rem]" />
        </div>
        <div className="flex gap-2">
          <LoadingBlock lines={1} className="flex-1" />
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="space-y-2 p-3">
            <LoadingBlock lines={4} />
          </div>
        </div>
      </div>} />
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      <h2 className="text-lg tracking-wide font-light">表 — Tablo</h2>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Yeni görev..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={`h-9 px-2 ${filterActive ? "text-foreground" : "text-muted-foreground"}`} title="Filtre">
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

      {filterActive && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-light tracking-wide">
          <span>Filtre:</span>
          {statusFilter !== "all" && <span className="px-1.5 py-0.5 rounded-sm bg-accent/50">{statusFilter === "active" ? "Aktif" : "Tamamlanan"}</span>}
          {activeCategory && <span className="px-1.5 py-0.5 rounded-sm bg-accent/50 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: colorHex(activeCategory.color) }} />{activeCategory.name}</span>}
          <button onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }} className="ml-auto hover:text-foreground">Temizle</button>
        </div>
      )}

      {visible.length === 0 && doneTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">{filterActive ? "Filtreye uygun görev yok" : "Aktif görev yok"}</p>
        </div>
      ) : visible.length > 0 && (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-light tracking-wide">Başlık</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
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
              </SortableContext>
            </DndContext>
          </Table>
        </div>
      )}

      {/* Tamamlananlar */}
      {doneTasks.length > 0 && (() => {
        const visibleDone = showDone ? doneTasks : doneTasks.slice(0, 3);
        const hiddenCount = Math.max(0, doneTasks.length - 3);
        return (
          <div className="border border-border/60 rounded-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-card/30">
              <span className="tracking-wide">了 — Tamamlananlar</span>
              <span className="text-muted-foreground/60">{doneTasks.length}</span>
            </div>
            <Table>
              <TableBody>
                {visibleDone.map((task) => (
                  <TableRow key={task.id} className="group cursor-pointer" onClick={() => setEditTask(task)}>
                    <TableCell className="w-8 sm:w-10 py-1 px-1 sm:px-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked
                        onCheckedChange={() => updateTask(task.id, { status: "todo" })}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-light text-muted-foreground line-through px-1 sm:px-2 py-1 break-words">{task.title}</TableCell>
                    <TableCell className="text-[10px] sm:text-[11px] text-muted-foreground/70 font-light text-right whitespace-nowrap px-1 sm:px-2 py-1">
                      {task.completed_at
                        ? format(parseISO(task.completed_at), "d MMM HH:mm", { locale: tr })
                        : "—"}
                    </TableCell>
                    <TableCell className="w-10 sm:w-12 text-right px-1 sm:px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
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
                onClick={() => setShowDone(!showDone)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 tracking-wide transition-colors border-t border-border/40"
              >
                {showDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenCount} tane daha göster`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Gizlenenler */}
      {hiddenTasks.length > 0 && (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
          >
            {showHidden ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="tracking-wide">隠 — Gizlenenler</span>
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
      />
    </div>
  );
};

export default TableView;
