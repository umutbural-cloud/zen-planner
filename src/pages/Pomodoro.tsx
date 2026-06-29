import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Check, SkipForward, Clock, Trash2, Bell, BellOff, Moon, Sun, Plus, X, Filter, ArrowUpDown, Tags, Pencil, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro, formatMMSS } from "@/hooks/usePomodoro";
import { useTheme } from "@/hooks/useTheme";
import { useAppShellProjects } from "@/components/AppShell";
import { usePomodoroCategories, PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { TASK_COLORS, colorClasses, TaskColor } from "@/lib/taskColors";
import { colorHex } from "@/hooks/useHabitCategories";
import { CategoryColorPicker } from "@/components/CategoryColorPicker";
import PomodoroTaskBoard from "@/components/PomodoroTaskBoard";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MobileWorkHistoryDaySection, type MobileWorkHistoryEntry } from "@/features/work-history/components/MobileWorkHistoryDaySection";

type Session = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
  category_id: string | null;
};

type PomodoroSessionUpdate = Database["public"]["Tables"]["pomodoro_sessions"]["Update"];

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

const parseStorageDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
};

const formatDateForStorage = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDateForDisplay = (value: string) => {
  const date = parseStorageDate(value);
  return date ? format(date, "dd.MM.yyyy") : "Tarih seç";
};

const entryPickerBaseClass =
  "items-center gap-2 rounded-none border-0 border-b border-border/60 bg-transparent px-0 pb-2 text-left text-[0.85rem] font-light leading-none outline-none transition-colors hover:border-foreground/40 focus:border-foreground/50 md:w-auto md:max-w-none md:rounded-sm md:border md:border-border/60 md:bg-background md:px-2 md:py-1 md:text-xs";

const entryDatePickerTriggerClass = `flex w-full justify-between ${entryPickerBaseClass}`;
const entryTimePickerShellClass = `flex w-full justify-between ${entryPickerBaseClass} tabular-nums`;
const entryTimeInputClass =
  "min-w-0 flex-1 bg-transparent p-0 text-[0.85rem] font-light leading-none tabular-nums outline-none placeholder:text-muted-foreground/50 focus:ring-0 md:text-xs";

const getTimeDigits = (value: string) => value.replace(/\D/g, "").slice(0, 4);

const formatHHMM = (hour: number, minute: number) =>
  `${String(Math.min(23, Math.max(0, hour))).padStart(2, "0")}:${String(Math.min(59, Math.max(0, minute))).padStart(2, "0")}`;

const normalizeManualTimeInput = (value: string, fallback: string) => {
  const digits = getTimeDigits(value);
  if (!digits) return fallback;

  let hour = 0;
  let minute = 0;

  if (digits.length === 1) {
    hour = Number(digits);
  } else if (digits.length === 2) {
    hour = Number(digits);
  } else if (digits.length === 3) {
    const firstTwo = Number(digits.slice(0, 2));
    if (firstTwo > 23) {
      hour = Number(digits[0]);
      minute = Number(digits.slice(1, 3));
    } else {
      hour = firstTwo;
      minute = Number(`${digits[2]}0`);
    }
  } else {
    hour = Number(digits.slice(0, 2));
    minute = Number(digits.slice(2, 4));
  }

  if (Number.isNaN(hour) || Number.isNaN(minute)) return fallback;

  return formatHHMM(hour, minute);
};

const normalizeTimeDisplay = (value: string, fallback: string) =>
  /^\d{2}:\d{2}$/.test(value) ? value : normalizeManualTimeInput(value, fallback);

const getEditableTimePosition = (position: number | null) => {
  const pos = position ?? 0;
  if (pos <= 0) return 0;
  if (pos === 1) return 1;
  if (pos <= 3) return 3;
  return 4;
};

const getFollowingTimePosition = (position: number) => {
  if (position === 0) return 1;
  if (position === 1) return 3;
  if (position === 3) return 4;
  return 5;
};

const getPreviousTimePosition = (position: number | null) => {
  const pos = position ?? 0;
  if (pos <= 1) return 0;
  if (pos <= 3) return 1;
  if (pos <= 4) return 3;
  return 4;
};

const replaceTimeDigit = (value: string, caretPosition: number | null, digit: string, fallback: string) => {
  const displayValue = normalizeTimeDisplay(value, fallback);
  const position = getEditableTimePosition(caretPosition);
  const chars = displayValue.split("");
  chars[position] = digit;

  return {
    value: chars.join(""),
    caret: getFollowingTimePosition(position),
  };
};

const setTimeInputCaret = (input: HTMLInputElement, position: number) => {
  window.requestAnimationFrame(() => {
    if (!input.isConnected || typeof input.setSelectionRange !== "function") return;
    input.setSelectionRange(position, position);
  });
};

type EntryDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const EntryDatePicker = ({ value, onChange }: EntryDatePickerProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className={entryDatePickerTriggerClass} aria-label="Tarih seç">
        <span className="leading-none">{formatDateForDisplay(value)}</span>
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="z-50 w-auto rounded-sm border border-border/60 bg-popover/95 p-2 shadow-lg"
    >
      <Calendar
        mode="single"
        selected={parseStorageDate(value)}
        locale={tr}
        weekStartsOn={1}
        onSelect={(date) => {
          if (date) onChange(formatDateForStorage(date));
        }}
        className="p-1"
        classNames={{
          caption_label: "text-xs",
          day: "h-8 w-8 text-xs",
          head_cell: "w-8 text-[0.7rem]",
          cell: "h-8 w-8",
        }}
      />
    </PopoverContent>
  </Popover>
);

type EntryTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

const EntryTimePicker = ({ value, onChange, ariaLabel }: EntryTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const lastValidValueRef = useRef(normalizeManualTimeInput(value, "09:00"));

  useEffect(() => {
    if (/^\d{2}:\d{2}$/.test(value)) {
      lastValidValueRef.current = normalizeManualTimeInput(value, lastValidValueRef.current);
    }
  }, [value]);

  const commitManualValue = () => {
    const normalized = normalizeManualTimeInput(value, lastValidValueRef.current);
    lastValidValueRef.current = normalized;
    onChange(normalized);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={entryTimePickerShellClass}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="09:00"
          value={value}
          onChange={(event) => onChange(normalizeManualTimeInput(event.target.value, lastValidValueRef.current))}
          onKeyDown={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.key === "Tab") return;

            if (/^\d$/.test(event.key)) {
              event.preventDefault();
              const target = event.currentTarget;
              const { value: nextValue, caret } = replaceTimeDigit(
                value,
                target.selectionStart,
                event.key,
                lastValidValueRef.current
              );

              onChange(nextValue);
              setTimeInputCaret(target, caret);
              return;
            }

            if (event.key === "Backspace") {
              event.preventDefault();
              const target = event.currentTarget;
              setTimeInputCaret(target, getPreviousTimePosition(target.selectionStart));
              return;
            }

            if (event.key === "Delete") {
              event.preventDefault();
              setTimeInputCaret(event.currentTarget, getEditableTimePosition(event.currentTarget.selectionStart));
            }
          }}
          onBlur={commitManualValue}
          onFocus={(event) => {
            const target = event.currentTarget;
            window.setTimeout(() => {
              if (!target.isConnected || typeof target.scrollIntoView !== "function") return;

              target.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 120);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const normalized = normalizeManualTimeInput(event.clipboardData.getData("text"), lastValidValueRef.current);
            lastValidValueRef.current = normalized;
            onChange(normalized);
            setTimeInputCaret(event.currentTarget, 5);
          }}
          className={entryTimeInputClass}
          aria-label={ariaLabel.replace("seç", "yaz")}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={ariaLabel}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 self-center" />
          </button>
        </PopoverTrigger>
      </div>
    <PopoverContent
      align="start"
      className="z-50 w-24 rounded-sm border border-border/60 bg-popover/95 p-1 shadow-lg"
    >
      <div className="max-h-48 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {TIME_OPTIONS.map((option) => {
            const active = option === value.slice(0, 5);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  lastValidValueRef.current = option;
                  onChange(option);
                  setOpen(false);
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
  </Popover>
  );
};


const Pomodoro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useAppShellProjects();
  const { theme, toggle: toggleTheme } = useTheme();
  const { remainingSec, phase, kind, setDuration, start, pause, resume, complete, skipBreak, isLoading } = usePomodoro();
  const { categories, create: createCategory, update: updateCategory, remove: removeCategory } = usePomodoroCategories();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingTime, setEditingTime] = useState(false);
  const [editVal, setEditVal] = useState(formatMMSS(remainingSec));
  const [showAddForm, setShowAddForm] = useState(true);
  const [addDate, setAddDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("09:25");
  const [addNote, setAddNote] = useState("");
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<"started_desc" | "started_asc" | "dur_desc" | "dur_asc">("started_desc");
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const requestNotif = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }
    if (Notification.permission === "granted") {
      toast("Bildirimler zaten açık.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    if (result === "granted") {
      toast.success("Bildirimler açıldı. Pomodoro bittiğinde haber vereceğiz.");
      try {
        new Notification("Zen Planner", { body: "Bildirimler aktif." });
      } catch {
        toast("Bildirim gösterimi tarayıcı tarafından engellendi.");
      }
    } else {
      toast.error("Bildirim izni reddedildi.");
    }
  };

  useEffect(() => {
    if (!editingTime) setEditVal(formatMMSS(remainingSec));
  }, [remainingSec, editingTime]);

  const commitTime = () => {
    const m = editVal.match(/^(\d{1,3}):?(\d{0,2})$/);
    if (m) {
      const mins = parseInt(m[1] || "0", 10);
      const secs = parseInt(m[2] || "0", 10);
      const total = mins * 60 + secs;
      if (total > 0) setDuration(total);
    }
    setEditingTime(false);
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(500);
    setSessions((data || []) as Session[]);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("pomodoro:session-saved", handler);
    return () => window.removeEventListener("pomodoro:session-saved", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Last 3 distinct days, with category filtering and sorting
  const grouped = useMemo(() => {
    const cutoff = startOfDay(subDays(new Date(), 2)); // today, yesterday, day-before
    let filtered = sessions.filter((s) => parseISO(s.started_at) >= cutoff);
    if (filterCategoryId !== "all") {
      filtered = filtered.filter((s) =>
        filterCategoryId === "__none__" ? !s.category_id : s.category_id === filterCategoryId
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "started_asc": return a.started_at.localeCompare(b.started_at);
        case "dur_desc": return b.duration_seconds - a.duration_seconds;
        case "dur_asc": return a.duration_seconds - b.duration_seconds;
        default: return b.started_at.localeCompare(a.started_at);
      }
    });
    const map = new Map<string, Session[]>();
    sorted.forEach((s) => {
      const key = format(startOfDay(parseISO(s.started_at)), "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    // Order day groups by most recent (or by sortBy if asc time)
    const entries = Array.from(map.entries());
    if (sortBy === "started_asc") entries.sort((a, b) => a[0].localeCompare(b[0]));
    else entries.sort((a, b) => b[0].localeCompare(a[0]));
    return entries;
  }, [sessions, filterCategoryId, sortBy]);

  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isBreak = kind === "break";

  const updateNote = async (id: string, note: string) => {
    if (!user) return;
    await supabase.from("pomodoro_sessions").update({ note }).eq("id", id).eq("user_id", user.id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, note } : s)));
  };

  const updateDuration = async (id: string, totalSeconds: number) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    const newDuration = Math.max(1, Math.round(totalSeconds));
    const newEnd = new Date(parseISO(session.started_at).getTime() + newDuration * 1000).toISOString();
    if (!user) return;
    await supabase.from("pomodoro_sessions").update({ duration_seconds: newDuration, ended_at: newEnd }).eq("id", id).eq("user_id", user.id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, duration_seconds: newDuration, ended_at: newEnd } : s)));
  };

  const updateTimes = async (id: string, startedAt: string, endedAt: string) => {
    if (!user) return;
    const startMs = parseISO(startedAt).getTime();
    const endMs = parseISO(endedAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      toast.error("Bitiş başlangıçtan sonra olmalı.");
      return;
    }
    const newDuration = Math.max(1, Math.round((endMs - startMs) / 1000));
    await supabase
      .from("pomodoro_sessions")
      .update({ started_at: startedAt, ended_at: endedAt, duration_seconds: newDuration })
      .eq("id", id)
      .eq("user_id", user.id);
    setSessions((arr) =>
      arr.map((s) => (s.id === id ? { ...s, started_at: startedAt, ended_at: endedAt, duration_seconds: newDuration } : s))
    );
  };

  const updateSessionCategory = async (id: string, category_id: string | null) => {
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, category_id } : s)));
    const payload: PomodoroSessionUpdate = { category_id };
    if (!user) return;
    await supabase.from("pomodoro_sessions").update(payload).eq("id", id).eq("user_id", user.id);
  };

  const deleteSession = async (id: string) => {
    if (!user) return;
    await supabase.from("pomodoro_sessions").delete().eq("id", id).eq("user_id", user.id);
    setSessions((arr) => arr.filter((s) => s.id !== id));
  };

  const addManualSession = async () => {
    if (!user) return;
    const sm = addStart.match(/^(\d{1,2}):(\d{2})$/);
    const em = addEnd.match(/^(\d{1,2}):(\d{2})$/);
    if (!sm || !em) { toast.error("Geçerli saat girin (SS:DD)."); return; }
    const dm = addDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dm) { toast.error("Geçerli tarih girin."); return; }
    const startD = new Date(+dm[1], +dm[2] - 1, +dm[3], +sm[1], +sm[2], 0, 0);
    const endD = new Date(+dm[1], +dm[2] - 1, +dm[3], +em[1], +em[2], 0, 0);
    if (endD.getTime() <= startD.getTime()) { toast.error("Bitiş başlangıçtan sonra olmalı."); return; }
    const dur = Math.round((endD.getTime() - startD.getTime()) / 1000);
    const { data, error } = await supabase.from("pomodoro_sessions").insert({
      user_id: user.id,
      started_at: startD.toISOString(),
      ended_at: endD.toISOString(),
      duration_seconds: dur,
      kind: "work",
      note: addNote || null,
      category_id: addCategoryId,
    }).select().single();
    if (error) { toast.error("Eklenemedi."); return; }
    setSessions((arr) => [data as Session, ...arr].sort((a, b) => b.started_at.localeCompare(a.started_at)));
    setShowAddForm(false);
    setAddNote("");
    toast.success("Çalışma eklendi.");
  };

  return (
    <>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-14 flex items-center border-b border-border/60 px-4 gap-3 md:h-12 md:min-h-0">
            <SidebarTrigger className="h-10 w-10 text-muted-foreground md:h-8 md:w-8" />
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-light tracking-wide">Pomodoro</h1>
            <div className="ml-auto flex items-center gap-2">
              {notifPerm !== "granted" && notifPerm !== "unsupported" && (
                <button
                  onClick={requestNotif}
                  title="Pomodoro bittiğinde bildirim al"
                  className="flex min-h-10 items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground md:min-h-0 md:rounded-sm md:px-2 md:py-1"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bildirimleri aç</span>
                </button>
              )}
              {notifPerm === "granted" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Bildirimler açık">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              )}
              {notifPerm === "denied" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60" title="Bildirimler engellendi (tarayıcı ayarlarından açın)">
                  <BellOff className="h-3.5 w-3.5" />
                </span>
              )}
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Aydınlık tema" : "Karanlık tema"}
                className="min-h-10 min-w-10 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:min-h-0 md:min-w-0 md:rounded-sm md:p-1.5"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-5xl px-5 py-7 sm:p-8">
              <div
                className={`text-center transition-all duration-700 ease-out ${
                  isRunning ? "py-24" : "py-12"
                }`}
              >
                <div
                  className={`text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4 transition-opacity duration-500 ${
                    isRunning ? "opacity-40" : "opacity-100"
                  }`}
                >
                  {isBreak ? "Dinlenme" : "Çalışma"}
                </div>

                {isLoading ? (
                  <div className="mb-8 select-none text-6xl font-extralight tracking-widest text-muted-foreground/50 tabular-nums sm:text-8xl">
                    --:--
                  </div>
                ) : editingTime && isIdle ? (
                  <input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={commitTime}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitTime();
                      if (e.key === "Escape") { setEditVal(formatMMSS(remainingSec)); setEditingTime(false); }
                    }}
                    autoFocus
                    className="mx-auto mb-8 block w-[28rem] max-w-full border-b border-border/60 bg-transparent text-center text-6xl font-extralight tracking-widest tabular-nums outline-none focus:border-foreground/40 sm:text-8xl"
                  />
                ) : (
                  <button
                    onClick={() => { if (isIdle) { setEditVal(formatMMSS(remainingSec)); setEditingTime(true); } }}
                    disabled={!isIdle}
                    title={isIdle ? "Süreyi düzenlemek için tıkla" : ""}
                    className={`mx-auto mb-8 block text-6xl font-extralight tracking-widest tabular-nums transition-all duration-700 ease-out sm:text-8xl ${
                      isRunning
                        ? "scale-110 text-foreground"
                        : isIdle
                        ? "hover:text-foreground/80 cursor-text"
                        : ""
                    }`}
                  >
                    {formatMMSS(remainingSec)}
                  </button>
                )}

                <div
                  className={`flex items-center justify-center gap-3 transition-all duration-700 ease-out ${
                    isRunning ? "opacity-30 hover:opacity-100 scale-95" : "opacity-100 scale-100"
                  }`}
                >
                  {isLoading ? (
                    <button disabled className="flex min-h-11 items-center gap-2 rounded-lg border border-border/60 px-5 py-2 text-sm text-muted-foreground/60 cursor-not-allowed md:rounded-sm">
                      Yükleniyor...
                    </button>
                  ) : isRunning ? (
                    <>
                      <button onClick={pause} className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm transition-colors hover:bg-accent/80 md:rounded-sm">
                        <Pause className="h-4 w-4" /> Duraklat
                      </button>
                      {isBreak ? (
                        <button onClick={skipBreak} className="flex min-h-11 items-center gap-2 rounded-lg border border-border/60 px-5 py-2 text-sm transition-colors hover:bg-accent/50 md:rounded-sm">
                          <SkipForward className="h-4 w-4" /> Atla
                        </button>
                      ) : (
                        <button onClick={complete} className="flex min-h-11 items-center gap-2 rounded-lg border border-border/60 px-5 py-2 text-sm transition-colors hover:bg-accent/50 md:rounded-sm">
                          <Check className="h-4 w-4" /> Tamamla
                        </button>
                      )}
                    </>
                  ) : isPaused ? (
                    <>
                      <button onClick={resume} className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm transition-colors hover:bg-accent/80 md:rounded-sm">
                        <Play className="h-4 w-4" /> Devam
                      </button>
                      <button onClick={complete} className="flex min-h-11 items-center gap-2 rounded-lg border border-border/60 px-5 py-2 text-sm transition-colors hover:bg-accent/50 md:rounded-sm">
                        <Check className="h-4 w-4" /> Tamamla
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={start} className="flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-7 py-2.5 text-sm text-background transition-colors hover:bg-foreground/90 md:min-h-0 md:rounded-sm md:px-6 md:py-2">
                        <Play className="h-4 w-4" /> Başlat
                      </button>
                      {isBreak && (
                        <button onClick={skipBreak} className="flex min-h-11 items-center gap-2 rounded-lg border border-border/60 px-5 py-2 text-sm transition-colors hover:bg-accent/50 md:rounded-sm">
                          <SkipForward className="h-4 w-4" /> Atla
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div
                className={`mt-12 transition-all duration-700 ease-out ${
                  isRunning ? "opacity-30 hover:opacity-100" : "opacity-100"
                }`}
              >
                <PomodoroTaskBoard projects={projects} />
              </div>

              <section
                className={`mt-12 transition-all duration-700 ease-out ${
                  isRunning ? "opacity-30 hover:opacity-100" : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
                      Çalışma Geçmişi
                    </div>
                    <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">(son 3 gün)</span>
                    <button
                      onClick={() => setShowAddForm((v) => !v)}
                      title="Geçmiş çalışma ekle"
                      className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>

                    {/* Filter by category */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          aria-label="Kategoriye göre filtrele"
                          title="Kategoriye göre filtrele"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border/60 p-0 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground sm:h-auto sm:w-auto sm:gap-1 sm:px-1.5 sm:py-0.5"
                        >
                          <Filter className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {filterCategoryId === "all"
                              ? "Tümü"
                              : filterCategoryId === "__none__"
                              ? "Kategorisiz"
                              : categories.find((c) => c.id === filterCategoryId)?.name || "Filtre"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-48 p-1">
                        <button
                          onClick={() => setFilterCategoryId("all")}
                          className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCategoryId === "all" ? "bg-accent" : ""}`}
                        >
                          Tümü
                        </button>
                        <button
                          onClick={() => setFilterCategoryId("__none__")}
                          className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCategoryId === "__none__" ? "bg-accent" : ""}`}
                        >
                          Kategorisiz
                        </button>
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setFilterCategoryId(c.id)}
                            className={`w-full flex items-center gap-2 text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCategoryId === c.id ? "bg-accent" : ""}`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(c.color) }} />
                            {c.name}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>

                    {/* Sort */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          aria-label="Sırala"
                          title="Sırala"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border/60 p-0 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground sm:h-auto sm:w-auto sm:gap-1 sm:px-1.5 sm:py-0.5"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span className="hidden sm:inline">Sırala</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-56 p-1">
                        {([
                          ["started_desc", "Başlangıç (yeni → eski)"],
                          ["started_asc", "Başlangıç (eski → yeni)"],
                          ["dur_desc", "Süre (uzun → kısa)"],
                          ["dur_asc", "Süre (kısa → uzun)"],
                        ] as const).map(([k, l]) => (
                          <button
                            key={k}
                            onClick={() => setSortBy(k)}
                            className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${sortBy === k ? "bg-accent" : ""}`}
                          >
                            {l}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>

                    <button
                      onClick={() => setShowCategoriesDialog(true)}
                      aria-label="Kategorileri yönet"
                      title="Kategorileri yönet"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border/60 p-0 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground sm:h-auto sm:w-auto sm:gap-1 sm:px-1.5 sm:py-0.5"
                    >
                      <Tags className="h-3 w-3" />
                      <span className="hidden sm:inline">Kategoriler</span>
                    </button>
                  </div>
                  <button
                    onClick={() => navigate("/work-history")}
                    className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Tümünü gör →
                  </button>
                </div>

                {showAddForm && (
                  <div className="mb-4 space-y-5 rounded-[1.25rem] border border-border/50 bg-card/70 p-5 shadow-sm md:space-y-2 md:rounded-sm md:border-border/60 md:bg-card/40 md:p-3 md:shadow-none">
                    <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:items-center md:gap-2">
                      <div className="col-span-2 flex flex-col gap-1.5 md:col-span-1 md:gap-1">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:text-[10px]">Tarih</label>
                        <EntryDatePicker value={addDate} onChange={setAddDate} />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5 md:gap-1">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:text-[10px]">Başlangıç</label>
                        <EntryTimePicker value={addStart} onChange={setAddStart} ariaLabel="Başlangıç saati seç" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5 md:gap-1">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:text-[10px]">Bitiş</label>
                        <EntryTimePicker value={addEnd} onChange={setAddEnd} ariaLabel="Bitiş saati seç" />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="Not (opsiyonel)"
                      className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:bg-background/70 md:rounded-sm md:border-border/60 md:bg-background md:px-2 md:py-1 md:text-xs"
                    />
                    <div className="space-y-2 md:flex md:flex-wrap md:items-center md:gap-2 md:space-y-0">
                      <span className="block shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:text-[10px]">Kategori:</span>
                      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                        <button
                          onClick={() => setAddCategoryId(null)}
                          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors md:rounded-sm md:px-2 md:py-0.5 md:text-[10px] ${addCategoryId === null ? "bg-accent border-foreground/30" : "border-border/60 hover:bg-accent/50"}`}
                        >
                          Yok
                        </button>
                        {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setAddCategoryId(c.id)}
                          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors md:rounded-sm md:px-2 md:py-0.5 md:text-[10px] ${addCategoryId === c.id ? "bg-accent border-foreground/30" : "border-border/60 hover:bg-accent/50"}`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorHex(c.color) }} />
                          {c.name}
                        </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 md:flex md:justify-end md:pt-0">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="rounded-xl border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 md:rounded-sm md:py-1 md:text-xs"
                      >
                        İptal
                      </button>
                      <button
                        onClick={addManualSession}
                        className="rounded-xl bg-foreground px-3 py-2.5 text-sm text-background transition-colors hover:bg-foreground/90 md:rounded-sm md:py-1 md:text-xs"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                )}

                {grouped.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">Henüz oturum yok</div>
                ) : (
                  <div className="space-y-6">
                    {grouped.map(([day, items]) => {
                      const totalSec = items.filter((s) => s.kind === "work").reduce((a, s) => a + s.duration_seconds, 0);
                      const h = Math.floor(totalSec / 3600);
                      const m = Math.floor((totalSec % 3600) / 60);
                      const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
                      const isToday = day === todayKey;
                      return (
                        <DayGroup
                          key={day}
                          day={day}
                          items={items}
                          isToday={isToday}
                          totalLabel={`${h > 0 ? `${h}s ` : ""}${m}d`}
                          categories={categories}
                          onUpdateNote={updateNote}
                          onUpdateDuration={updateDuration}
                          onUpdateTimes={updateTimes}
                          onUpdateCategory={updateSessionCategory}
                          onDelete={deleteSession}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>

      {/* Categories management dialog */}
      <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">Kategoriler</DialogTitle>
            <DialogDescription className="text-xs">Adı ve rengi düzenle, ekle veya sil</DialogDescription>
          </DialogHeader>
          <CategoriesEditor
            categories={categories}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onRemove={removeCategory}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

const DayGroup = ({
  day,
  items,
  isToday,
  totalLabel,
  categories,
  onUpdateNote,
  onUpdateDuration,
  onUpdateTimes,
  onUpdateCategory,
  onDelete,
}: {
  day: string;
  items: Session[];
  isToday: boolean;
  totalLabel: string;
  categories: PomodoroCategory[];
  onUpdateNote: (id: string, note: string) => void;
  onUpdateDuration: (id: string, totalSeconds: number) => void;
  onUpdateTimes: (id: string, startedAt: string, endedAt: string) => void;
  onUpdateCategory: (id: string, category_id: string | null) => void;
  onDelete: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = isToday || expanded ? items : items.slice(0, 3);
  const hiddenCount = items.length - visibleItems.length;
  const dayDate = parseISO(day);
  const totalSeconds = items.filter((s) => s.kind === "work").reduce((acc, s) => acc + s.duration_seconds, 0);
  const mobileEntries: MobileWorkHistoryEntry[] = visibleItems.map((session) => {
    const cat = categories.find((c) => c.id === session.category_id);
    const note = session.note?.trim();
    return {
      id: session.id,
      title: note || (session.kind === "break" ? "Mola" : "Odak çalışması"),
      subtitle: session.kind === "break" ? "Mola" : cat?.name || "Kategorisiz",
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationSeconds: session.duration_seconds,
      color: cat ? colorHex(cat.color) : undefined,
    };
  });
  const toggleFooter = !isToday && items.length > 3 ? (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full px-3 py-2.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
    >
      {expanded ? "Daha az göster" : `Devamını göster (+${hiddenCount})`}
    </button>
  ) : null;

  return (
    <>
      <div className="md:hidden">
        <MobileWorkHistoryDaySection
          date={dayDate}
          totalSeconds={totalSeconds}
          entries={mobileEntries}
          footer={toggleFooter}
        />
      </div>

      <div className="hidden overflow-hidden rounded-sm border border-border/60 md:block">
        <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-3 py-2">
          <span className="text-sm font-light">
            {format(dayDate, "d MMMM yyyy, EEEE", { locale: tr })}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">{totalLabel}</span>
        </div>
        <div className="divide-y divide-border/40">
          {visibleItems.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              categories={categories}
              onUpdateNote={onUpdateNote}
              onUpdateDuration={onUpdateDuration}
              onUpdateTimes={onUpdateTimes}
              onUpdateCategory={onUpdateCategory}
              onDelete={onDelete}
            />
          ))}
        </div>
        {!isToday && items.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full border-t border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            {expanded ? "Daha az göster" : `Devamını göster (+${hiddenCount})`}
          </button>
        )}
      </div>
    </>
  );
};

const CategoriesEditor = ({
  categories,
  onCreate,
  onUpdate,
  onRemove,
}: {
  categories: PomodoroCategory[];
  onCreate: (name: string, color?: string) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<{ name: string; color: string }>) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
}) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("gray");
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-72 overflow-auto">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input
              defaultValue={c.name}
              onBlur={(e) => e.target.value !== c.name && onUpdate(c.id, { name: e.target.value })}
              className="flex-1 bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs px-1 py-1"
            />
            <CategoryColorPicker value={c.color} onChange={(k) => onUpdate(c.id, { color: k })} size="sm" />
            <button onClick={() => onRemove(c.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 pt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni kategori"
          className="flex-1 bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs px-1 py-1"
        />
        <CategoryColorPicker value={newColor} onChange={setNewColor} size="sm" />
        <button
          onClick={async () => {
            if (!newName.trim()) return;
            await onCreate(newName.trim(), newColor);
            setNewName("");
          }}
          className="px-2 py-1 text-xs rounded-sm bg-foreground text-background hover:bg-foreground/90"
        >
          Ekle
        </button>
      </div>
    </div>
  );
};

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
  }
  if (m === 0) return `${s} sn`;
  if (s === 0) return `${m} dk`;
  return `${m} dk ${s} sn`;
};

// Convert ISO -> "HH:mm" in local timezone for input value
const isoToTimeInput = (iso: string) => format(parseISO(iso), "HH:mm");
// Combine date from existing iso + new "HH:mm" -> ISO
const combineDateTime = (baseIso: string, hhmm: string): string | null => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const d = parseISO(baseIso);
  const next = new Date(d);
  next.setHours(hh, mm, 0, 0);
  return next.toISOString();
};

const SessionRow = ({
  session,
  categories,
  onUpdateNote,
  onUpdateDuration,
  onUpdateTimes,
  onUpdateCategory,
  onDelete,
}: {
  session: Session;
  categories: PomodoroCategory[];
  onUpdateNote: (id: string, note: string) => void;
  onUpdateDuration: (id: string, totalSeconds: number) => void;
  onUpdateTimes: (id: string, startedAt: string, endedAt: string) => void;
  onUpdateCategory: (id: string, category_id: string | null) => void;
  onDelete: (id: string) => void;
}) => {
  const [note, setNote] = useState(session.note || "");
  const [editingDur, setEditingDur] = useState(false);
  const initialEditVal = () => {
    const m = Math.floor(session.duration_seconds / 60);
    const s = session.duration_seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  const [durVal, setDurVal] = useState(initialEditVal());

  const [editingTimes, setEditingTimes] = useState(false);
  const [startVal, setStartVal] = useState(isoToTimeInput(session.started_at));
  const [endVal, setEndVal] = useState(isoToTimeInput(session.ended_at));

  useEffect(() => {
    setDurVal(initialEditVal());
    setStartVal(isoToTimeInput(session.started_at));
    setEndVal(isoToTimeInput(session.ended_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.duration_seconds, session.started_at, session.ended_at]);

  const commitDur = () => {
    const match = durVal.match(/^(\d{1,3}):?(\d{0,2})$/);
    if (match) {
      const mins = parseInt(match[1] || "0", 10);
      const secs = parseInt(match[2] || "0", 10);
      const total = mins * 60 + secs;
      if (total > 0 && total !== session.duration_seconds) {
        onUpdateDuration(session.id, total);
      } else {
        setDurVal(initialEditVal());
      }
    } else {
      setDurVal(initialEditVal());
    }
    setEditingDur(false);
  };

  const commitTimes = () => {
    const newStart = combineDateTime(session.started_at, startVal);
    const newEnd = combineDateTime(session.ended_at, endVal);
    if (!newStart || !newEnd) {
      setStartVal(isoToTimeInput(session.started_at));
      setEndVal(isoToTimeInput(session.ended_at));
      setEditingTimes(false);
      return;
    }
    if (newStart === session.started_at && newEnd === session.ended_at) {
      setEditingTimes(false);
      return;
    }
    onUpdateTimes(session.id, newStart, newEnd);
    setEditingTimes(false);
  };

  const cat = categories.find((c) => c.id === session.category_id);

  return (
    <div className="group flex items-center gap-3 px-3 py-2 text-xs">
      {session.kind === "break" ? (
        <span className="text-[10px] uppercase tracking-wider w-20 text-muted-foreground">Mola</span>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-20 text-left flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-foreground/80"
              title="Kategori seç"
            >
              {cat ? (
                <>
                  <span className="h-2 w-2 rounded-full" style={{ background: colorHex(cat.color) }} />
                  <span className="truncate">{cat.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground/60">— kategori</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            <button
              onClick={() => onUpdateCategory(session.id, null)}
              className="w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent"
            >
              Kategorisiz
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onUpdateCategory(session.id, c.id)}
                className="w-full flex items-center gap-2 text-left px-2 py-1 text-xs rounded-sm hover:bg-accent"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(c.color) }} />
                {c.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
      {editingDur ? (
        <input
          value={durVal}
          onChange={(e) => setDurVal(e.target.value)}
          onBlur={commitDur}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDur();
            if (e.key === "Escape") { setDurVal(initialEditVal()); setEditingDur(false); }
          }}
          autoFocus
          placeholder="dk:sn"
          className="w-20 bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums"
        />
      ) : (
        <button
          onClick={() => setEditingDur(true)}
          title="Süreyi düzenle (dk:sn)"
          className="tabular-nums w-28 text-left hover:text-foreground/80"
        >
          {formatDuration(session.duration_seconds)}
        </button>
      )}
      {editingTimes ? (
        <div className="flex items-center gap-1 w-40">
          <input
            type="time"
            value={startVal}
            onChange={(e) => setStartVal(e.target.value)}
            onBlur={commitTimes}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTimes();
              if (e.key === "Escape") {
                setStartVal(isoToTimeInput(session.started_at));
                setEndVal(isoToTimeInput(session.ended_at));
                setEditingTimes(false);
              }
            }}
            className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[68px]"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="time"
            value={endVal}
            onChange={(e) => setEndVal(e.target.value)}
            onBlur={commitTimes}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTimes();
              if (e.key === "Escape") {
                setStartVal(isoToTimeInput(session.started_at));
                setEndVal(isoToTimeInput(session.ended_at));
                setEditingTimes(false);
              }
            }}
            className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[68px]"
          />
        </div>
      ) : (
        <button
          onClick={() => setEditingTimes(true)}
          title="Başlangıç–bitiş saatlerini düzenle"
          className="tabular-nums text-muted-foreground w-40 text-left hover:text-foreground/80"
        >
          {format(parseISO(session.started_at), "HH:mm")} - {format(parseISO(session.ended_at), "HH:mm")}
        </button>
      )}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (session.note || "") && onUpdateNote(session.id, note)}
        placeholder="ne çalıştın?"
        className="flex-1 bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/40"
      />
      <button
        onClick={() => onDelete(session.id)}
        title="Sil"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Pomodoro;
