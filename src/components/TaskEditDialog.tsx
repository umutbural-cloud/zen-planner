import { useEffect, useState } from "react";
import { Trash2, Plus, Check, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks, Task, TaskColor, TaskKind } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { TASK_COLORS, colorClasses } from "@/lib/taskColors";

type Props = {
  task: Task | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasksOverride?: Task[];
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<unknown> | unknown;
  onDeleteTask?: (id: string) => Promise<unknown> | unknown;
  onCreateTask?: (task: {
    title: string;
    parent_block_id?: string | null;
  }) => Promise<unknown> | unknown;
};

const TaskColorPicker = ({ value, onChange }: { value: TaskColor; onChange: (c: TaskColor) => void }) => (
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

const TaskEditDialog = ({ task, projectId, open, onOpenChange, tasksOverride, onUpdateTask, onDeleteTask, onCreateTask }: Props) => {
  const { tasks: hookTasks, updateTask: hookUpdateTask, deleteTask: hookDeleteTask, createTask: hookCreateTask } = useTasks(projectId);
  const tasks = tasksOverride || hookTasks;
  const updateTask = onUpdateTask || hookUpdateTask;
  const deleteTask = onDeleteTask || hookDeleteTask;
  const createTask = onCreateTask || hookCreateTask;
  const { categories } = usePomodoroCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [color, setColor] = useState<TaskColor>("gray");
  const [kind, setKind] = useState<TaskKind>("task");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setStartDate(task.start_date || "");
    setEndDate(task.end_date || "");
    setStartTime(task.start_time?.slice(0, 5) || "");
    setEndTime(task.end_time?.slice(0, 5) || "");
    setCategoryId(task.category_id || null);
    setColor((task.color || "gray") as TaskColor);
    setKind((task.kind || "task") as TaskKind);
  }, [task]);

  if (!task) return null;

  const subtasks = tasks.filter((t) => t.parent_block_id === task.id);
  const activeCategory = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        category_id: categoryId,
        color,
        kind,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onOpenChange(false);
  };

  const handleAddSubtask = async () => {
    const v = newSubtitle.trim();
    if (!v) return;
    await createTask({ title: v, parent_block_id: task.id });
    setNewSubtitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-light tracking-wide">Görevi Düzenle</DialogTitle>
          <DialogDescription className="sr-only">
            Görev başlığı, açıklaması, tarihleri, kategorisi, rengi, tipi ve alt görevleri düzenlenir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlık</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent" autoFocus />
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Açıklama</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama..." className="bg-transparent min-h-[70px] resize-none" />
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Kategori</div>
              <Popover>
                <PopoverTrigger asChild>
                <button type="button" className="w-full flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm text-left">
                  {activeCategory ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorHex(activeCategory.color) }} />
                      <span className="font-light">{activeCategory.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground font-light">Kategori seç...</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start">
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="text-muted-foreground">Yok</span>
                  {!categoryId && <Check className="h-3 w-3 ml-auto" />}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorHex(c.color) }} />
                    <span>{c.name}</span>
                    {categoryId === c.id && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5 tracking-wide">Renk</div>
              <TaskColorPicker value={color} onChange={setColor} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Tip</div>
              <div className="flex border border-border/60 rounded-sm overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setKind("task")}
                  className={`flex-1 px-2 py-1.5 ${kind === "task" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
                >
                  Görev
                </button>
                <button
                  type="button"
                  onClick={() => setKind("timebox")}
                  className={`flex-1 px-2 py-1.5 flex items-center justify-center gap-1 ${kind === "timebox" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
                >
                  <Timer className="h-3 w-3" /> Time-box
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç tarihi</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş tarihi</div>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç saati</div>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş saati</div>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent" />
            </div>
          </div>

          {startTime && endTime && startDate && startDate === endDate && (
            <p className="text-[10px] text-muted-foreground/70 font-light leading-relaxed">
              Tamamlandığında bu zaman aralığı otomatik olarak çalışma geçmişine eklenecek.
            </p>
          )}

          {/* Alt görevler */}
          <div>
            <div className="text-[10px] text-muted-foreground mb-2 tracking-wide flex items-center justify-between">
              <span>Alt görevler {subtasks.length > 0 && <span className="text-muted-foreground/60 ml-1">({subtasks.length})</span>}</span>
            </div>
            <div className="space-y-1">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={s.status === "done"}
                    onCheckedChange={(c) => updateTask(s.id, { status: c ? "done" : "todo" })}
                  />
                  <span className={`text-sm font-light flex-1 ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {s.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTask(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-muted-foreground/50" />
                <Input
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    void handleAddSubtask();
                  }}
                  placeholder="Alt görev ekle..."
                  className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleAddSubtask()}
                  disabled={!newSubtitle.trim()}
                  className="h-7 px-2 text-xs"
                >
                  Ekle
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Sil</span>
            </Button>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditDialog;
