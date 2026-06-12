import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { formatDateTimeParts } from "../columns";
import { formatTaskStatus } from "../statusLabels";
import type { AdvancedTaskColumnId } from "../types";

type AdvancedTaskRowProps = {
  task: Task;
  columns: AdvancedTaskColumnId[];
  categories: PomodoroCategory[];
  subtaskCount: number;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  return value.slice(0, 16).replace("T", " ");
};

const blurActiveElement = () => {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
};

const AdvancedTaskRow = ({ task, columns, categories, subtaskCount, onUpdate, onDelete, onOpen }: AdvancedTaskRowProps) => {
  const [title, setTitle] = useState(task.title);
  const category = categories.find((item) => item.id === task.category_id);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const flushTitle = () => {
    const nextTitle = title.trim();
    if (nextTitle && nextTitle !== task.title) {
      onUpdate(task.id, { title: nextTitle });
    } else {
      setTitle(task.title);
    }
  };

  const handleStatusChange = (value: string) => {
    if (value === task.status) return;
    onUpdate(task.id, { status: value === "done" ? "done" : value === "in_progress" ? "in_progress" : "todo" });
  };

  const handleCategoryChange = (value: string) => {
    const nextCategoryId = value === "none" ? null : value;
    if (nextCategoryId === task.category_id) return;
    onUpdate(task.id, { category_id: nextCategoryId });
  };

  const handleHiddenChange = (value: string) => {
    const nextHidden = value === "hidden";
    if (nextHidden === task.hidden) return;
    onUpdate(task.id, { hidden: nextHidden });
  };

  const renderCell = (columnId: AdvancedTaskColumnId) => {
    switch (columnId) {
      case "title":
        return (
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={flushTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setTitle(task.title);
                event.currentTarget.blur();
              }
            }}
            className="h-7 min-w-[12rem] border-none bg-transparent p-0 text-sm font-light focus-visible:ring-0"
          />
        );
      case "status":
        return (
          <select
            value={task.status}
            onChange={(event) => handleStatusChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Durum değiştir"
            className="h-7 rounded-sm border border-border/50 bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="todo">{formatTaskStatus("todo")}</option>
            <option value="in_progress">{formatTaskStatus("in_progress")}</option>
            <option value="done">{formatTaskStatus("done")}</option>
          </select>
        );
      case "category":
        return (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: category ? colorHex(category.color) : "transparent" }} />
            <select
              value={task.category_id ?? "none"}
              onChange={(event) => handleCategoryChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              aria-label="Kategori değiştir"
              className="h-7 max-w-[13rem] rounded-sm border border-border/50 bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="none">Kategorisiz</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "start":
        return <span className="text-xs text-muted-foreground">{formatDateTimeParts(task.start_date, task.start_time)}</span>;
      case "end":
        return <span className="text-xs text-muted-foreground">{formatDateTimeParts(task.end_date, task.end_time)}</span>;
      case "completed_at":
        return <span className="text-xs text-muted-foreground">{formatDateTime(task.completed_at)}</span>;
      case "hidden":
        return (
          <select
            value={task.hidden ? "hidden" : "visible"}
            onChange={(event) => handleHiddenChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Görünürlük değiştir"
            className="h-7 rounded-sm border border-border/50 bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="visible">Görünür</option>
            <option value="hidden">Gizli</option>
          </select>
        );
      case "kind":
        return <span className="text-xs text-muted-foreground">{task.kind === "timebox" ? "Timebox" : "Görev"}</span>;
      case "color":
        return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorHex(task.color) }} />;
      case "subtasks":
        return <span className="text-xs text-muted-foreground">{subtaskCount}</span>;
      default:
        return null;
    }
  };

  return (
    <TableRow className="group">
      <TableCell className="w-9 px-2 py-1" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={(checked) => onUpdate(task.id, { status: checked ? "done" : "todo" })}
        />
      </TableCell>
      {columns.map((columnId) => (
        <TableCell key={columnId} className="px-2 py-1 align-middle">
          {renderCell(columnId)}
        </TableCell>
      ))}
      <TableCell className="w-28 px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => {
              flushTitle();
              blurActiveElement();
              onOpen(task);
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Düzenle"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate(task.id, { hidden: !task.hidden })}
            className="p-1 text-muted-foreground hover:text-foreground"
            title={task.hidden ? "Göster" : "Gizle"}
          >
            {task.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive" title="Sil">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default AdvancedTaskRow;
