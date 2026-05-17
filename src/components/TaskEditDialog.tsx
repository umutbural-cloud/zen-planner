import { useEffect, useState } from "react";
import { Trash2, Package, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks, Task } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { useBacklog } from "@/hooks/useBacklog";
import { colorHex } from "@/hooks/useHabitCategories";
import { toast } from "sonner";

type Props = {
  task: Task | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TaskEditDialog = ({ task, projectId, open, onOpenChange }: Props) => {
  const { tasks, updateTask, deleteTask, createTask } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const { createItem: createBacklog } = useBacklog();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [newSubtitle, setNewSubtitle] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setStartDate(task.start_date || "");
    setEndDate(task.end_date || "");
    setStartTime(task.start_time?.slice(0, 5) || "");
    setEndTime(task.end_time?.slice(0, 5) || "");
    setCategoryId((task as any).category_id || null);
  }, [task]);

  if (!task) return null;

  const subtasks = tasks.filter((t) => t.parent_block_id === task.id);
  const activeCategory = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    if (!title.trim()) return;
    await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      category_id: categoryId,
    } as any);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onOpenChange(false);
  };

  const handleSendToBacklog = async () => {
    await createBacklog({ title: task.title } as any);
    await deleteTask(task.id);
    toast.success("Heybeye gönderildi");
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
          <DialogTitle className="text-base font-light tracking-wide">編 — Görevi Düzenle</DialogTitle>
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
                <button className="w-full flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm text-left">
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
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="Alt görev ekle..."
                  className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendToBacklog}
              className="text-muted-foreground hover:text-foreground"
              title="Görevi heybeye geri gönder"
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs tracking-wide">Heybeye gönder</span>
            </Button>
            <Button
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
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button size="sm" onClick={handleSave}>Kaydet</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditDialog;
