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
        return <span className="text-xs text-muted-foreground">{formatTaskStatus(task.status)}</span>;
      case "category":
        return category ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorHex(category.color) }} />
            {category.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/70">Kategorisiz</span>
        );
      case "start":
        return <span className="text-xs text-muted-foreground">{formatDateTimeParts(task.start_date, task.start_time)}</span>;
      case "end":
        return <span className="text-xs text-muted-foreground">{formatDateTimeParts(task.end_date, task.end_time)}</span>;
      case "completed_at":
        return <span className="text-xs text-muted-foreground">{formatDateTime(task.completed_at)}</span>;
      case "hidden":
        return <span className="text-xs text-muted-foreground">{task.hidden ? "Gizli" : "Görünür"}</span>;
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
