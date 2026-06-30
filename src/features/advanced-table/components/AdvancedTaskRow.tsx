import { useEffect, useState } from "react";
import { CalendarIcon, ChevronDown, ChevronRight, Clock3, Eye, EyeOff, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { tr } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Task, TaskImportance, TaskUrgency } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { formatTaskImportance, formatTaskUrgency } from "../columns";
import { formatTaskStatus } from "../statusLabels";
import type { AdvancedTaskColumnId } from "../types";

type AdvancedTaskRowProps = {
  task: Task;
  columns: AdvancedTaskColumnId[];
  categories: PomodoroCategory[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  subtasks: Task[];
  expanded: boolean;
  onToggleExpanded: (taskId: string) => void;
  rowDragEnabled?: boolean;
  sortableId?: string;
};

const cellControlClassName =
  "h-7 rounded-sm border border-transparent bg-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-border/60 hover:bg-card/40 hover:text-foreground focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/40";

const blurActiveElement = () => {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
};

const formatDateForDisplay = (value: string | null) => {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
};

const formatDateForStorage = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseStorageDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const formatTimeForDisplay = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const formatDateMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

const formatTimeMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const parseDisplayDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return undefined;

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return undefined;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return undefined;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;

  return formatDateForStorage(date);
};

const parseDisplayTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const [, hourRaw, minuteRaw] = match;
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return undefined;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const AdvancedTaskRow = ({
  task,
  columns,
  categories,
  onUpdate,
  onDelete,
  onOpen,
  subtasks,
  expanded,
  onToggleExpanded,
  rowDragEnabled = false,
  sortableId,
}: AdvancedTaskRowProps) => {
  const [title, setTitle] = useState(task.title);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);
  const [startDateInput, setStartDateInput] = useState(formatDateForDisplay(task.start_date));
  const [startTimeInput, setStartTimeInput] = useState(formatTimeForDisplay(task.start_time));
  const [endDateInput, setEndDateInput] = useState(formatDateForDisplay(task.end_date));
  const [endTimeInput, setEndTimeInput] = useState(formatTimeForDisplay(task.end_time));
  const category = categories.find((item) => item.id === task.category_id);
  const doneSubtaskCount = subtasks.filter((subtask) => subtask.status === "done").length;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? `row-disabled:${task.id}`,
    disabled: !rowDragEnabled || !sortableId,
  });
  const rowStyle = rowDragEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setStartDateOpen(false);
    setStartTimeOpen(false);
    setEndDateOpen(false);
    setEndTimeOpen(false);
  }, [task.id]);

  useEffect(() => {
    setStartDateInput(formatDateForDisplay(task.start_date));
    setStartTimeInput(formatTimeForDisplay(task.start_time));
    setEndDateInput(formatDateForDisplay(task.end_date));
    setEndTimeInput(formatTimeForDisplay(task.end_time));
  }, [task.end_date, task.end_time, task.start_date, task.start_time]);

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

  const commitDateValue = (
    inputValue: string,
    currentValue: string | null,
    setInputValue: (value: string) => void,
    onCommit: (value: string | null) => void,
  ) => {
    const parsed = parseDisplayDate(inputValue);
    if (parsed === undefined) {
      setInputValue(formatDateForDisplay(currentValue));
      return;
    }
    if (parsed !== currentValue) {
      onCommit(parsed);
    }
    setInputValue(formatDateForDisplay(parsed));
  };

  const commitTimeValue = (
    inputValue: string,
    currentValue: string | null,
    setInputValue: (value: string) => void,
    onCommit: (value: string | null) => void,
  ) => {
    const parsed = parseDisplayTime(inputValue);
    if (parsed === undefined) {
      setInputValue(formatTimeForDisplay(currentValue));
      return;
    }
    if (parsed !== currentValue) {
      onCommit(parsed);
    }
    setInputValue(formatTimeForDisplay(parsed));
  };

  const renderDatePopover = (
    value: string | null,
    onSelect: (next: Date | undefined) => void,
  ) => {
    const selectedDate = value ? parseStorageDate(value) : null;
    return (
      <PopoverContent
        align="start"
        className="z-50 w-auto rounded-sm border border-border/60 bg-popover/95 p-2 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          locale={tr}
          weekStartsOn={1}
          onSelect={onSelect}
          className="p-1"
          classNames={{
            caption_label: "text-xs",
            day: "h-8 w-8 text-xs",
            head_cell: "w-8 text-[0.7rem]",
            cell: "h-8 w-8",
          }}
        />
      </PopoverContent>
    );
  };

  const renderTimePopover = (
    value: string | null,
    onSelect: (next: string | null) => void,
  ) => (
    <PopoverContent
      align="start"
      className="z-50 w-24 rounded-sm border border-border/60 bg-popover/95 p-1 shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="max-h-48 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {TIME_OPTIONS.map((option) => {
            const active = option === value?.slice(0, 5);
            return (
              <button
                key={option}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(option);
                }}
                className={`block w-full rounded-sm px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </PopoverContent>
  );

  const renderCell = (columnId: AdvancedTaskColumnId) => {
    switch (columnId) {
      case "title":
        return (
          <div className="flex min-w-[12rem] items-center gap-1.5">
            {subtasks.length > 0 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpanded(task.id);
                }}
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-card/40 hover:text-foreground"
                aria-label={expanded ? "Alt görevleri kapat" : "Alt görevleri aç"}
                title={expanded ? "Alt görevleri kapat" : "Alt görevleri aç"}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
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
              className="h-7 min-w-[12rem] border border-transparent bg-transparent px-1.5 text-sm font-light text-foreground transition-colors hover:border-border/60 hover:bg-card/40 focus-visible:ring-1 focus-visible:ring-ring/40"
            />
            {subtasks.length > 0 && (
              <span className="shrink-0 text-[10px] text-muted-foreground/60">
                {doneSubtaskCount}/{subtasks.length}
              </span>
            )}
          </div>
        );
      case "status":
        return (
          <select
            value={task.status}
            onChange={(event) => handleStatusChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Durum değiştir"
            className={cellControlClassName}
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
              className={`${cellControlClassName} max-w-[13rem]`}
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
        return (
          <div className="flex min-w-[13rem] items-center gap-1 whitespace-nowrap">
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <div className="inline-flex h-7 items-center rounded-sm border border-transparent bg-transparent hover:border-border/60 hover:bg-card/40 focus-within:border-ring/50">
                <Input
                  value={startDateInput}
                  onChange={(event) => setStartDateInput(formatDateMask(event.target.value))}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onBlur={() => {
                    commitDateValue(startDateInput, task.start_date, setStartDateInput, (next) => onUpdate(task.id, { start_date: next }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setStartDateInput(formatDateForDisplay(task.start_date));
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="gg.aa.yyyy"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-7 w-[5.25rem] border-none bg-transparent px-1.5 text-xs text-muted-foreground focus-visible:ring-0"
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setStartDateOpen(true);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setStartDateOpen(true);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-card/40 hover:text-foreground"
                    aria-label="Başlangıç takvimini aç"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
              </div>
              {renderDatePopover(task.start_date, (next) => {
                  if (!next) return;
                  const nextValue = formatDateForStorage(next);
                  setStartDateInput(formatDateForDisplay(nextValue));
                  onUpdate(task.id, { start_date: nextValue });
                  setStartDateOpen(false);
                })}
            </Popover>
            <Popover open={startTimeOpen} onOpenChange={setStartTimeOpen}>
              <div className="inline-flex h-7 items-center rounded-sm border border-transparent bg-transparent hover:border-border/60 hover:bg-card/40 focus-within:border-ring/50">
                <Input
                  value={startTimeInput}
                  onChange={(event) => setStartTimeInput(formatTimeMask(event.target.value))}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onBlur={() => {
                    commitTimeValue(startTimeInput, task.start_time, setStartTimeInput, (next) => onUpdate(task.id, { start_time: next }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setStartTimeInput(formatTimeForDisplay(task.start_time));
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="ss:dd"
                  inputMode="numeric"
                  maxLength={5}
                  className="h-7 w-[3.75rem] border-none bg-transparent px-1.5 text-xs text-muted-foreground focus-visible:ring-0"
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setStartTimeOpen(true);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setStartTimeOpen(true);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-card/40 hover:text-foreground"
                    aria-label="Başlangıç saat önerilerini aç"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
              </div>
              {renderTimePopover(task.start_time, (next) => {
                  setStartTimeInput(formatTimeForDisplay(next));
                  onUpdate(task.id, { start_time: next });
                  setStartTimeOpen(false);
                })}
            </Popover>
            {(task.start_date || task.start_time) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setStartDateInput("");
                  setStartTimeInput("");
                  onUpdate(task.id, { start_date: null, start_time: null });
                }}
                className="h-7 w-7 px-0 text-[11px]"
                title="Temizle"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      case "end":
        return (
          <div className="flex min-w-[13rem] items-center gap-1 whitespace-nowrap">
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <div className="inline-flex h-7 items-center rounded-sm border border-transparent bg-transparent hover:border-border/60 hover:bg-card/40 focus-within:border-ring/50">
                <Input
                  value={endDateInput}
                  onChange={(event) => setEndDateInput(formatDateMask(event.target.value))}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onBlur={() => {
                    commitDateValue(endDateInput, task.end_date, setEndDateInput, (next) => onUpdate(task.id, { end_date: next }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setEndDateInput(formatDateForDisplay(task.end_date));
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="gg.aa.yyyy"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-7 w-[5.25rem] border-none bg-transparent px-1.5 text-xs text-muted-foreground focus-visible:ring-0"
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEndDateOpen(true);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEndDateOpen(true);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-card/40 hover:text-foreground"
                    aria-label="Bitiş takvimini aç"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
              </div>
              {renderDatePopover(task.end_date, (next) => {
                  if (!next) return;
                  const nextValue = formatDateForStorage(next);
                  setEndDateInput(formatDateForDisplay(nextValue));
                  onUpdate(task.id, { end_date: nextValue });
                  setEndDateOpen(false);
                })}
            </Popover>
            <Popover open={endTimeOpen} onOpenChange={setEndTimeOpen}>
              <div className="inline-flex h-7 items-center rounded-sm border border-transparent bg-transparent hover:border-border/60 hover:bg-card/40 focus-within:border-ring/50">
                <Input
                  value={endTimeInput}
                  onChange={(event) => setEndTimeInput(formatTimeMask(event.target.value))}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onBlur={() => {
                    commitTimeValue(endTimeInput, task.end_time, setEndTimeInput, (next) => onUpdate(task.id, { end_time: next }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setEndTimeInput(formatTimeForDisplay(task.end_time));
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="ss:dd"
                  inputMode="numeric"
                  maxLength={5}
                  className="h-7 w-[3.75rem] border-none bg-transparent px-1.5 text-xs text-muted-foreground focus-visible:ring-0"
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEndTimeOpen(true);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEndTimeOpen(true);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-card/40 hover:text-foreground"
                    aria-label="Bitiş saat önerilerini aç"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
              </div>
              {renderTimePopover(task.end_time, (next) => {
                  setEndTimeInput(formatTimeForDisplay(next));
                  onUpdate(task.id, { end_time: next });
                  setEndTimeOpen(false);
                })}
            </Popover>
            {(task.end_date || task.end_time) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setEndDateInput("");
                  setEndTimeInput("");
                  onUpdate(task.id, { end_date: null, end_time: null });
                }}
                className="h-7 w-7 px-0 text-[11px]"
                title="Temizle"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      case "urgency":
        return (
          <select
            value={task.urgency ?? ""}
            onChange={(event) => onUpdate(task.id, { urgency: event.target.value ? event.target.value as Exclude<TaskUrgency, null> : null })}
            onClick={(event) => event.stopPropagation()}
            aria-label="Aciliyet değiştir"
            className={cellControlClassName}
          >
            <option value="">-</option>
            <option value="urgent">{formatTaskUrgency("urgent")}</option>
            <option value="not_urgent">{formatTaskUrgency("not_urgent")}</option>
          </select>
        );
      case "importance":
        return (
          <select
            value={task.importance ?? ""}
            onChange={(event) => onUpdate(task.id, { importance: event.target.value ? event.target.value as Exclude<TaskImportance, null> : null })}
            onClick={(event) => event.stopPropagation()}
            aria-label="Önem değiştir"
            className={cellControlClassName}
          >
            <option value="">-</option>
            <option value="important">{formatTaskImportance("important")}</option>
            <option value="not_important">{formatTaskImportance("not_important")}</option>
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TableRow
        ref={rowDragEnabled ? setNodeRef : undefined}
        style={rowStyle}
        className={`group h-11 md:h-auto ${isDragging ? "relative z-10 bg-card/40" : ""}`}
      >
        <TableCell className={`w-16 py-1.5 pr-3 md:w-12 md:pr-2 md:py-1 ${task.status === "done" ? "pl-2 md:pl-2" : "pl-3 md:pl-2"}`} onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2">
            {rowDragEnabled ? (
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="inline-flex h-8 w-5 touch-none cursor-grab items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground active:cursor-grabbing md:h-6 md:w-4"
                aria-label="Görevi sırala"
                title="Sürükle"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            ) : (
              <span
                className="inline-flex h-8 w-5 items-center justify-center rounded-sm text-muted-foreground/25 md:h-6 md:w-4"
                aria-label="Sıralama pasif"
                title="Sürükleme için sıralama, filtre ve gruplamayı kapat"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            )}
            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={(checked) => onUpdate(task.id, { status: checked === true ? "done" : "todo" })}
            />
          </div>
        </TableCell>
        {columns.map((columnId) => (
          <TableCell key={columnId} className="px-2 py-1.5 align-middle md:py-1">
            {renderCell(columnId)}
          </TableCell>
        ))}
        <TableCell className="w-14 px-2 py-1.5 text-right md:w-28 md:py-1">
          <div className="flex items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                flushTitle();
                blurActiveElement();
                onOpen(task);
              }}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground md:min-h-0 md:min-w-0 md:rounded-sm md:p-1"
              title="Düzenle"
              aria-label="Düzenle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate(task.id, { hidden: !task.hidden })}
              className="hidden p-1 text-muted-foreground hover:text-foreground md:inline-flex"
              title={task.hidden ? "Göster" : "Gizle"}
              aria-label={task.hidden ? "Göster" : "Gizle"}
            >
              {task.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => onDelete(task.id)} className="hidden p-1 text-muted-foreground hover:text-destructive md:inline-flex" title="Sil" aria-label="Sil">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && subtasks.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columns.length + 2} className="!pb-4 !pl-4 !pr-0 !pt-2 sm:!pb-4 sm:!pl-4 sm:!pr-0 sm:!pt-2">
            <div className="ml-10 mr-2">
              <div className="space-y-0.5 py-0.5">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="group/subtask flex min-h-6 cursor-pointer items-center gap-2 rounded-sm px-1 py-0 text-sm leading-5 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(subtask);
                    }}
                  >
                    <Checkbox
                      checked={subtask.status === "done"}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={(checked) => onUpdate(subtask.id, { status: checked === true ? "done" : "todo" })}
                      className="h-3.5 w-3.5"
                    />
                    <span className={`min-w-0 flex-1 truncate font-light ${subtask.status === "done" ? "text-muted-foreground/70 line-through" : ""}`}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(subtask.id);
                      }}
                      className="p-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover/subtask:opacity-100"
                      title="Sil"
                      aria-label="Alt görevi sil"
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

export default AdvancedTaskRow;
