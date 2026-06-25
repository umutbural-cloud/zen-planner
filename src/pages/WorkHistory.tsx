import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Settings2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { usePageState } from "@/hooks/usePageState";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DelayedInlineLoading, LoadingBlock } from "@/components/ui/delayed-loading";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorClasses, type TaskColor } from "@/lib/taskColors";
import { colorHex } from "@/hooks/useHabitCategories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Session = {
  id: string;
  started_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
  category_id: string | null;
};

type PomodoroSessionRow = Database["public"]["Tables"]["pomodoro_sessions"]["Row"];
type ChartTooltipPayload = {
  payload?: {
    sec?: number;
  };
};
type OffDaysSaveStatus = "idle" | "saved" | "error";

const formatDur = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h} Saat ${m} Dakika`;
  if (h > 0) return `${h} Saat`;
  return `${m} Dakika`;
};

const formatDurShort = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}s ${m}d`;
  if (h > 0) return `${h}s`;
  return `${m}d`;
};

const weekOfMonth = (d: Date) => {
  const first = startOfMonth(d);
  const firstWeekStart = startOfWeek(first, { weekStartsOn: 1 });
  const dWeekStart = startOfWeek(d, { weekStartsOn: 1 });
  return Math.floor((dWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
};

const todayKey = () => format(startOfDay(new Date()), "yyyy-MM-dd");
const dateKey = (d: Date) => format(startOfDay(d), "yyyy-MM-dd");
const OFF_DAYS_WEEK_STARTS_ON = 1;
const OFF_DAYS_WEEKDAY_LABELS: Record<number, string> = {
  0: "paz",
  1: "pzt",
  2: "sal",
  3: "çar",
  4: "per",
  5: "cum",
  6: "cmt",
};

const sameStringSet = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const WorkHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSection, setJournalDate } = usePageState();
  const { categories } = usePomodoroCategories();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [recentWeeks, setRecentWeeks] = useState(1);
  const [expandedSessionsByDay, setExpandedSessionsByDay] = useState<Record<string, boolean>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [catDayKey, setCatDayKey] = useState<string>(todayKey());
  const [recentCatFilter, setRecentCatFilter] = useState<Set<string>>(new Set());
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const isHistoryLoading = sessionsLoading;

  const NONE_CAT_KEY = "__none__";

  // ----- Stats category inclusion (persisted) -----
  // null = include all (default). Otherwise an explicit Set of included keys.
  const storageKey = user ? `keikaku:work-stats:included-cats:${user.id}` : null;
  const offDaysStorageKey = user ? `keikaku:work-stats:off-days:${user.id}` : null;
  const [includedCats, setIncludedCats] = useState<Set<string> | null>(null);
  const [offDays, setOffDays] = useState<Set<string>>(new Set());
  const [draftOffDays, setDraftOffDays] = useState<Set<string>>(new Set());
  const [offDaysSaveStatus, setOffDaysSaveStatus] = useState<OffDaysSaveStatus>("idle");
  const [statsSettingsOpen, setStatsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setIncludedCats(new Set(arr));
      } else {
        setIncludedCats(null);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!offDaysStorageKey) return;
    try {
      const raw = localStorage.getItem(offDaysStorageKey);
      if (!raw) {
        setOffDays(new Set());
        setDraftOffDays(new Set());
        return;
      }
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) {
        const saved = new Set(arr.filter((value): value is string => typeof value === "string" && value.length > 0));
        setOffDays(saved);
        setDraftOffDays(new Set(saved));
      } else {
        setOffDays(new Set());
        setDraftOffDays(new Set());
      }
    } catch {
      setOffDays(new Set());
      setDraftOffDays(new Set());
    }
  }, [offDaysStorageKey]);

  const persistIncluded = (next: Set<string> | null) => {
    setIncludedCats(next);
    if (!storageKey) return;
    try {
      if (next === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch { /* ignore */ }
  };

  const persistOffDays = (next: Set<string>) => {
    const saved = new Set(next);
    if (!offDaysStorageKey) {
      setOffDays(saved);
      return true;
    }
    try {
      if (saved.size === 0) localStorage.removeItem(offDaysStorageKey);
      else localStorage.setItem(offDaysStorageKey, JSON.stringify(Array.from(saved).sort()));
      setOffDays(saved);
      return true;
    } catch {
      return false;
    }
  };

  const isCatIncluded = useCallback((catId: string | null) => {
    if (includedCats === null) return true;
    return includedCats.has(catId ?? NONE_CAT_KEY);
  }, [includedCats]);

  const toggleStatsCat = (key: string) => {
    // Materialize current selection (treat null as "everything")
    const allKeys = [...categories.map((c) => c.id), NONE_CAT_KEY];
    const current = includedCats ?? new Set(allKeys);
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // If all enabled, store as null to keep "include all" behavior even for new categories
    const allOn = allKeys.every((k) => next.has(k));
    persistIncluded(allOn ? null : next);
  };

  const setAllStatsCats = (on: boolean) => {
    if (on) persistIncluded(null);
    else persistIncluded(new Set());
  };

  const filteredStatsSessions = useMemo(
    () => sessions.filter((s) => isCatIncluded(s.category_id)),
    [sessions, isCatIncluded],
  );

  const draftOffDaysSelected = useMemo(
    () => Array.from(draftOffDays).sort().map((value) => new Date(`${value}T00:00:00`)),
    [draftOffDays],
  );

  const draftOffDaySegments = useMemo(() => {
    const single: Date[] = [];
    const start: Date[] = [];
    const middle: Date[] = [];
    const end: Date[] = [];

    draftOffDaysSelected.forEach((day) => {
      const dayColumn = (day.getDay() - OFF_DAYS_WEEK_STARTS_ON + 7) % 7;
      const prevKey = dateKey(new Date(day.getTime() - 24 * 60 * 60 * 1000));
      const nextKey = dateKey(new Date(day.getTime() + 24 * 60 * 60 * 1000));
      const hasPrev = dayColumn > 0 && draftOffDays.has(prevKey);
      const hasNext = dayColumn < 6 && draftOffDays.has(nextKey);

      if (hasPrev && hasNext) middle.push(day);
      else if (hasPrev) end.push(day);
      else if (hasNext) start.push(day);
      else single.push(day);
    });

    return { single, start, middle, end };
  }, [draftOffDays, draftOffDaysSelected]);

  const offDaysDraftDirty = useMemo(() => !sameStringSet(offDays, draftOffDays), [offDays, draftOffDays]);

  const sessionCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const k = dateKey(parseISO(s.started_at));
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [sessions]);

  const toggleRecentCat = (key: string) => {
    setRecentCatFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const sessionMatchesFilter = useCallback((s: Session) => {
    if (recentCatFilter.size === 0) return true;
    return recentCatFilter.has(s.category_id ?? NONE_CAT_KEY);
  }, [recentCatFilter]);

  useEffect(() => {
    if (!user) {
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("pomodoro_sessions")
          .select("id, started_at, duration_seconds, kind, note, category_id")
          .eq("user_id", user.id)
          .eq("kind", "work")
          .order("started_at", { ascending: false })
          .limit(5000);
        setSessions(((data || []) as PomodoroSessionRow[]) as Session[]);
      } finally {
        setSessionsLoading(false);
      }
    })();
    return () => {
      setSessionsLoading(false);
    };
  }, [user]);

  // -------- Stats --------
  const stats = useMemo(() => {
    if (filteredStatsSessions.length === 0) {
      return { last7: 0, last30: 0, avgDaily: 0, hasData: false, excludedOffDays: 0 };
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const today = startOfDay(new Date());
    const todayKeyValue = dateKey(today);
    const day7Key = dateKey(new Date(today.getTime() - 6 * dayMs));
    const day30Key = dateKey(new Date(today.getTime() - 29 * dayMs));
    let last7 = 0, last30 = 0;
    filteredStatsSessions.forEach((s) => {
      const sessionDayKey = dateKey(parseISO(s.started_at));
      if (sessionDayKey >= day7Key && sessionDayKey <= todayKeyValue) last7 += s.duration_seconds;
      if (sessionDayKey >= day30Key && sessionDayKey <= todayKeyValue) last30 += s.duration_seconds;
    });
    let excludedOffDays = 0;
    offDays.forEach((key) => {
      if (key >= day30Key && key <= todayKeyValue) excludedOffDays += 1;
    });
    const activeDays = Math.max(1, 30 - excludedOffDays);
    return { last7, last30, avgDaily: Math.round(last30 / activeDays), hasData: true, excludedOffDays };
  }, [filteredStatsSessions, offDays]);

  // -------- Category breakdowns --------
  // Build a quick day index of seconds per category
  const sessionsByDayCat = useMemo(() => {
    const map = new Map<string, Map<string | null, number>>();
    filteredStatsSessions.forEach((s) => {
      const k = format(startOfDay(parseISO(s.started_at)), "yyyy-MM-dd");
      let inner = map.get(k);
      if (!inner) { inner = new Map(); map.set(k, inner); }
      inner.set(s.category_id, (inner.get(s.category_id) || 0) + s.duration_seconds);
    });
    return map;
  }, [filteredStatsSessions]);

  const catBreakdown = useMemo(() => {
    const aggregate = (fromDate: Date, toDate: Date) => {
      const totals = new Map<string | null, number>();
      const fromKey = format(fromDate, "yyyy-MM-dd");
      const toKey = format(toDate, "yyyy-MM-dd");
      sessionsByDayCat.forEach((inner, k) => {
        if (k >= fromKey && k <= toKey) {
          inner.forEach((sec, catId) => {
            totals.set(catId, (totals.get(catId) || 0) + sec);
          });
        }
      });
      return Array.from(totals.entries())
        .map(([catId, sec]) => ({ catId, sec }))
        .sort((a, b) => b.sec - a.sec);
    };
    const today = startOfDay(new Date());
    const day7 = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const day30 = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const dayMap = sessionsByDayCat.get(catDayKey);
    const dayList = dayMap
      ? Array.from(dayMap.entries()).map(([catId, sec]) => ({ catId, sec })).sort((a, b) => b.sec - a.sec)
      : [];

    return {
      day: dayList,
      week: aggregate(day7, today),
      month: aggregate(day30, today),
    };
  }, [sessionsByDayCat, catDayKey]);

  // -------- Daily chart series (last 30 days) --------
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const out: { date: string; label: string; minutes: number; sec: number; isOffDay: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const k = dateKey(d);
      const inner = sessionsByDayCat.get(k);
      let sec = 0;
      inner?.forEach((v) => { sec += v; });
      out.push({
        date: k,
        label: format(d, "d MMM", { locale: tr }),
        minutes: Math.round(sec / 60),
        sec,
        isOffDay: offDays.has(k),
      });
    }
    return out;
  }, [sessionsByDayCat, offDays]);

  const handleStatsSettingsOpenChange = (open: boolean) => {
    setStatsSettingsOpen(open);
    setDraftOffDays(new Set(offDays));
    setOffDaysSaveStatus("idle");
  };

  const updateDraftOffDaysFromDates = (dates: Date[] | undefined) => {
    const next = new Set((dates || []).filter(Boolean).map((d) => dateKey(d)));
    setDraftOffDays(next);
    setOffDaysSaveStatus("idle");
  };

  const clearDraftOffDays = () => {
    setDraftOffDays(new Set());
    setOffDaysSaveStatus("idle");
  };

  const resetDraftOffDays = () => {
    setDraftOffDays(new Set(offDays));
    setOffDaysSaveStatus("idle");
  };

  const saveDraftOffDays = () => {
    const saved = persistOffDays(draftOffDays);
    if (!saved) {
      setOffDaysSaveStatus("error");
      return;
    }
    setDraftOffDays(new Set(draftOffDays));
    setOffDaysSaveStatus("saved");
  };

  const removeDraftOffDay = (key: string) => {
    const next = new Set(draftOffDays);
    next.delete(key);
    setDraftOffDays(next);
    setOffDaysSaveStatus("idle");
  };

  // -------- Group: month -> week -> day --------
  const grouped = useMemo(() => {
    const months = new Map<
      string,
      {
        date: Date;
        total: number;
        weeks: Map<string, { weekNo: number; weekStart: Date; weekEnd: Date; total: number; days: Map<string, { date: Date; total: number }> }>;
      }
    >();

    sessions.forEach((s) => {
      const d = parseISO(s.started_at);
      const dayKey = format(startOfDay(d), "yyyy-MM-dd");
      const monthKey = format(startOfMonth(d), "yyyy-MM");
      const wkStart = startOfWeek(d, { weekStartsOn: 1 });
      const weekKey = format(wkStart, "yyyy-MM-dd");

      let m = months.get(monthKey);
      if (!m) { m = { date: startOfMonth(d), total: 0, weeks: new Map() }; months.set(monthKey, m); }
      m.total += s.duration_seconds;

      let w = m.weeks.get(weekKey);
      if (!w) {
        w = {
          weekNo: weekOfMonth(d),
          weekStart: wkStart,
          weekEnd: endOfWeek(d, { weekStartsOn: 1 }),
          total: 0,
          days: new Map(),
        };
        m.weeks.set(weekKey, w);
      }
      w.total += s.duration_seconds;

      let day = w.days.get(dayKey);
      if (!day) { day = { date: startOfDay(d), total: 0 }; w.days.set(dayKey, day); }
      day.total += s.duration_seconds;
    });

    return Array.from(months.entries())
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .map(([key, m]) => ({
        key,
        date: m.date,
        total: m.total,
        weeks: Array.from(m.weeks.entries())
          .sort((a, b) => b[1].weekStart.getTime() - a[1].weekStart.getTime())
          .map(([wk, w]) => ({
            key: wk,
            ...w,
            days: Array.from(w.days.entries())
              .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
              .map(([dk, d]) => ({ key: dk, ...d })),
          })),
      }));
  }, [sessions]);

  // -------- Recent days --------
  const recentDays = useMemo(() => {
    const filtered = sessions.filter(sessionMatchesFilter);
    const byDay = new Map<string, Session[]>();
    filtered.forEach((s) => {
      const k = format(startOfDay(parseISO(s.started_at)), "yyyy-MM-dd");
      const arr = byDay.get(k);
      if (arr) arr.push(s);
      else byDay.set(k, [s]);
    });
    const today = startOfDay(new Date());
    const out: { key: string; date: Date; total: number; sessions: Session[] }[] = [];
    for (let i = 0; i < recentWeeks * 7; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const k = format(d, "yyyy-MM-dd");
      const items = (byDay.get(k) || []).slice().sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
      const total = items.reduce((acc, s) => acc + s.duration_seconds, 0);
      out.push({ key: k, date: d, total, sessions: items });
    }
    return out;
  }, [sessions, recentWeeks, sessionMatchesFilter]);

  // Helpers for category lookup
  const catName = (id: string | null) => id ? (categories.find((c) => c.id === id)?.name || "—") : "Kategorisiz";
  const catColor = (id: string | null): TaskColor => (categories.find((c) => c.id === id)?.color as TaskColor) || "gray";

  const renderCatList = (rows: { catId: string | null; sec: number }[]) => {
    if (rows.length === 0) {
      return <div className="text-[11px] text-muted-foreground/50 italic px-1 py-2">Kayıt yok</div>;
    }
    const total = rows.reduce((a, r) => a + r.sec, 0);
    return (
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.sec / total) * 100) : 0;
          return (
            <li key={String(r.catId)} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full" style={{ background: colorHex(categories.find((c) => c.id === r.catId)?.color) }} />
                <span className="font-light truncate">{catName(r.catId)}</span>
                <span className="text-muted-foreground/50 text-[10px]">{pct}%</span>
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">{formatDurShort(r.sec)}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/60 px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <button
              onClick={() => navigate("/pomodoro")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pomodoro
            </button>
            <div className="h-4 w-px bg-border/60" />
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-light tracking-wide">Çalışma Geçmişi</h1>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-6 sm:p-8 space-y-10">
              <DelayedInlineLoading loading={isHistoryLoading} className="px-1" label="Çalışma geçmişi yükleniyor..." />

              {/* ============ STATS ============ */}
              <section>
                {isHistoryLoading ? (
                  <WorkHistoryOverviewLoading />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-xs uppercase tracking-widest text-muted-foreground/70">
                        İstatistikler
                      </h2>
                      <Popover open={statsSettingsOpen} onOpenChange={handleStatsSettingsOpenChange}>
                        <PopoverTrigger asChild>
                          <button
                            className="p-1 -m-1 text-muted-foreground/70 hover:text-foreground transition-colors rounded-sm hover:bg-accent/40"
                            title="İstatistik ayarları"
                            aria-label="İstatistik ayarları"
                          >
                            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 p-0">
                          <div className="px-3 py-2.5 border-b border-border/60">
                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                              Dahil edilen kategoriler
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-light leading-snug">
                              Yalnızca seçili kategoriler istatistik, grafik ve özetlere dahil edilir.
                            </div>
                          </div>
                          <div className="max-h-72 overflow-auto py-1">
                            {[
                              ...categories.map((c) => ({ key: c.id, name: c.name, color: c.color })),
                              { key: NONE_CAT_KEY, name: "Kategorisiz", color: "gray" },
                            ].map((c) => {
                              const checked = isCatIncluded(c.key === NONE_CAT_KEY ? null : c.key);
                              return (
                                <button
                                  key={c.key}
                                  onClick={() => toggleStatsCat(c.key)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/40 transition-colors text-left"
                                >
                                  <span
                                    className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                                      checked ? "bg-foreground border-foreground" : "border-border"
                                    }`}
                                  >
                                    {checked && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                                  </span>
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colorHex(c.color) }} />
                                  <span className="font-light flex-1 truncate">{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-border/60">
                            <button
                              onClick={() => setAllStatsCats(true)}
                              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-sm hover:bg-accent/40"
                            >
                              Tümünü seç
                            </button>
                            <button
                              onClick={() => setAllStatsCats(false)}
                              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-sm hover:bg-accent/40"
                            >
                              Tümünü kaldır
                            </button>
                          </div>
                          <div className="px-3 py-2.5 border-t border-border/60">
                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                              Off günler
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-light leading-snug">
                              Off günler günlük ortalama hesabında çalışma beklenen gün olarak sayılmaz.
                            </div>
                          </div>
                          <div className="px-3 py-2">
                            <Calendar
                              mode="multiple"
                              weekStartsOn={OFF_DAYS_WEEK_STARTS_ON}
                              locale={tr}
                              formatters={{
                                formatWeekdayName: (day) => OFF_DAYS_WEEKDAY_LABELS[day.getDay()],
                              }}
                              selected={draftOffDaysSelected}
                              onSelect={updateDraftOffDaysFromDates}
                              disabled={(d) => d > new Date()}
                              classNames={{
                                cell: "h-9 w-9 p-0 text-center text-sm relative [&:has([aria-selected])]:bg-primary/15 focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal rounded-none aria-selected:opacity-100",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-none",
                              }}
                              modifiers={{
                                offSingle: draftOffDaySegments.single,
                                offStart: draftOffDaySegments.start,
                                offMiddle: draftOffDaySegments.middle,
                                offEnd: draftOffDaySegments.end,
                              }}
                              modifiersClassNames={{
                                offSingle: "rounded-md",
                                offStart: "rounded-l-md rounded-r-none",
                                offMiddle: "rounded-none",
                                offEnd: "rounded-r-md rounded-l-none",
                              }}
                            />
                          </div>
                          <div className="border-t border-border/60 px-3 py-2">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                                Seçili günler
                              </span>
                              {draftOffDays.size > 0 ? (
                                <button
                                  onClick={clearDraftOffDays}
                                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Temizle
                                </button>
                              ) : null}
                            </div>
                            {draftOffDays.size === 0 ? (
                              <div className="text-[11px] text-muted-foreground/50 italic py-1">
                                Henüz off gün seçilmedi.
                              </div>
                            ) : (
                              <div className="max-h-32 overflow-auto space-y-1">
                                {Array.from(draftOffDays).sort((a, b) => b.localeCompare(a)).map((key) => {
                                  const sessionCount = sessionCountByDay.get(key) || 0;
                                  return (
                                    <div key={key} className="flex items-center justify-between gap-2 text-[11px]">
                                      <div className="min-w-0">
                                        <div className="font-light">
                                          {format(new Date(`${key}T00:00:00`), "d MMMM yyyy, EEEE", { locale: tr })}
                                        </div>
                                        {sessionCount > 0 ? (
                                          <div className="text-[10px] text-muted-foreground/60">
                                            {sessionCount} çalışma kaydı var; kayıtlar korunur.
                                          </div>
                                        ) : null}
                                      </div>
                                      <button
                                        onClick={() => removeDraftOffDay(key)}
                                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Off günü kaldır"
                                      >
                                        Kaldır
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                              <span
                                className={`text-[11px] ${
                                  offDaysSaveStatus === "error"
                                    ? "text-destructive"
                                    : offDaysDraftDirty
                                      ? "text-muted-foreground"
                                      : offDaysSaveStatus === "saved"
                                        ? "text-muted-foreground"
                                        : "text-muted-foreground/60"
                                }`}
                              >
                                {offDaysSaveStatus === "error"
                                  ? "Kaydedilemedi"
                                  : offDaysDraftDirty
                                    ? "Kaydedilmemiş değişiklikler var"
                                    : offDaysSaveStatus === "saved"
                                      ? "Kaydedildi"
                                      : "Kayıtlı seçimler gösteriliyor"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={resetDraftOffDays}
                                  disabled={!offDaysDraftDirty}
                                  className="text-[11px] text-muted-foreground transition-colors px-2 py-1 rounded-sm hover:bg-accent/40 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                >
                                  Geri al
                                </button>
                                <button
                                  onClick={saveDraftOffDays}
                                  disabled={!offDaysDraftDirty}
                                  className="text-[11px] text-foreground transition-colors px-2 py-1 rounded-sm border border-border/60 hover:bg-accent/40 disabled:opacity-40 disabled:hover:bg-transparent"
                                >
                                  Kaydet
                                </button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <StatCard label="Son 7 gün" value={formatDur(stats.last7)} />
                      <StatCard label="Son 30 gün" value={formatDur(stats.last30)} />
                      <StatCard
                        label="Günlük ortalama"
                        value={formatDur(stats.avgDaily)}
                        hint={stats.excludedOffDays > 0 ? `Son 30 gün · ${stats.excludedOffDays} off gün hariç` : "Son 30 gün"}
                      />
                    </div>

                    {/* Category breakdown */}
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="border border-border/60 rounded-sm p-3">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Günlük</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const d = new Date(`${catDayKey}T00:00:00`);
                                d.setDate(d.getDate() - 1);
                                setCatDayKey(format(d, "yyyy-MM-dd"));
                              }}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              title="Önceki gün"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors tabular-nums min-w-[64px] text-center px-1 py-0.5 rounded-sm hover:bg-accent/40"
                                  title="Tarih seç"
                                >
                                  {catDayKey === todayKey()
                                    ? "Bugün"
                                    : format(new Date(`${catDayKey}T00:00:00`), "d MMM", { locale: tr })}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={new Date(`${catDayKey}T00:00:00`)}
                                  onSelect={(d) => d && setCatDayKey(format(d, "yyyy-MM-dd"))}
                                  disabled={(d) => d > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => {
                                if (catDayKey >= todayKey()) return;
                                const d = new Date(`${catDayKey}T00:00:00`);
                                d.setDate(d.getDate() + 1);
                                setCatDayKey(format(d, "yyyy-MM-dd"));
                              }}
                              disabled={catDayKey >= todayKey()}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground"
                              title="Sonraki gün"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {renderCatList(catBreakdown.day)}
                      </div>
                      <div className="border border-border/60 rounded-sm p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Haftalık</span>
                          <span className="text-[10px] text-muted-foreground/50">son 7 gün</span>
                        </div>
                        {renderCatList(catBreakdown.week)}
                      </div>
                      <div className="border border-border/60 rounded-sm p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Aylık</span>
                          <span className="text-[10px] text-muted-foreground/50">son 30 gün</span>
                        </div>
                        {renderCatList(catBreakdown.month)}
                      </div>
                    </div>

                    {/* Daily chart */}
                    <div className="mt-5 border border-border/60 rounded-sm p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                          Günlük çalışma süresi
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">son 30 gün · dakika</span>
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              interval={4}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                              width={36}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                fontSize: 11,
                                borderRadius: 2,
                              }}
                              labelStyle={{ color: "hsl(var(--foreground))" }}
                              formatter={(_value: unknown, _name: unknown, payload: ChartTooltipPayload) => [
                                formatDurShort(payload.payload?.sec ?? 0),
                                "Çalışma",
                              ]}
                              labelFormatter={(_label: string, payload) => {
                                const point = payload?.[0]?.payload as { label?: string; isOffDay?: boolean } | undefined;
                                if (!point?.label) return "";
                                return point.isOffDay ? `${point.label} · Off gün` : point.label;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="minutes"
                              stroke="hsl(var(--foreground))"
                              strokeWidth={1.5}
                              dot={{ r: 2, fill: "hsl(var(--foreground))" }}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* ============ MONTH/WEEK/DAY GROUPED ============ */}
              {isHistoryLoading ? (
                <GroupedHistoryLoading />
              ) : grouped.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16">Henüz çalışma kaydı yok</div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
                    Aylar
                  </h2>
                  {grouped.map((m) => {
                    const monthOpen = openMonths[m.key] ?? true;
                    return (
                      <div key={m.key} className="border border-border/60 rounded-sm overflow-hidden">
                        <button
                          onClick={() => setOpenMonths((s) => ({ ...s, [m.key]: !monthOpen }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card/40 hover:bg-card/60 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-light">
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${monthOpen ? "rotate-90" : ""}`} />
                            {format(m.date, "LLLL yyyy", { locale: tr })}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{formatDur(m.total)}</span>
                        </button>

                        {monthOpen && (
                          <div className="divide-y divide-border/40">
                            {m.weeks.map((w) => {
                              const weekOpen = openWeeks[w.key] ?? false;
                              return (
                                <div key={w.key}>
                                  <button
                                    onClick={() => setOpenWeeks((s) => ({ ...s, [w.key]: !weekOpen }))}
                                    className="w-full flex items-center justify-between px-3 py-2 pl-8 hover:bg-accent/30 transition-colors"
                                  >
                                    <span className="flex items-center gap-2 text-sm font-light text-muted-foreground">
                                      <ChevronRight className={`h-3 w-3 transition-transform ${weekOpen ? "rotate-90" : ""}`} />
                                      {format(m.date, "LLLL", { locale: tr })} {w.weekNo}. Hafta
                                      <span className="text-[10px] text-muted-foreground/60 ml-1">
                                        ({format(w.weekStart, "d MMM", { locale: tr })} – {format(w.weekEnd, "d MMM", { locale: tr })})
                                      </span>
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{formatDur(w.total)}</span>
                                  </button>

                                  {weekOpen && (
                                    <div className="divide-y divide-border/40 bg-background/40">
                                      {w.days.map((d) => (
                                        <button
                                          key={d.key}
                                          onClick={() => {
                                            setJournalDate(d.key);
                                            setSection("journal");
                                            navigate("/");
                                          }}
                                          className="w-full flex items-center justify-between px-3 py-2 pl-14 hover:bg-accent/30 transition-colors text-left"
                                          title="Günlüğe git"
                                        >
                                          <span className="text-sm font-light">
                                            {format(d.date, "d MMMM, EEEE", { locale: tr })}
                                          </span>
                                          <span className="text-xs text-muted-foreground tabular-nums">{formatDur(d.total)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============ RECENT DAYS ============ */}
              {isHistoryLoading ? (
                <RecentDaysLoading recentWeeks={recentWeeks} />
              ) : (
              <div>
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
                  Son {recentWeeks} Hafta — Günlük
                </h2>

                {/* Category filter chips */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4 px-1">
                  {categories.map((c) => {
                    const active = recentCatFilter.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleRecentCat(c.id)}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                          active
                            ? "border-foreground/40 bg-accent/40 text-foreground"
                            : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: colorHex(c.color) }} />
                        {c.name}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => toggleRecentCat(NONE_CAT_KEY)}
                    className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                      recentCatFilter.has(NONE_CAT_KEY)
                        ? "border-foreground/40 bg-accent/40 text-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    Kategorisiz
                  </button>
                  {recentCatFilter.size > 0 && (
                    <button
                      onClick={() => setRecentCatFilter(new Set())}
                      className="text-[11px] px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {recentDays.map((d) => {
                    const sessionsExpanded = expandedSessionsByDay[d.key] ?? false;
                    const collapsed = collapsedDays[d.key] ?? false;
                    const visible = sessionsExpanded ? d.sessions : d.sessions.slice(0, 3);
                    return (
                      <div key={d.key} className="border border-border/60 rounded-sm overflow-hidden">
                        <button
                          onClick={() => setCollapsedDays((s) => ({ ...s, [d.key]: !collapsed }))}
                          className={`w-full flex items-center justify-between px-3 py-2 bg-card/40 ${collapsed ? "" : "border-b border-border/60"} hover:bg-card/60 transition-colors text-left`}
                          title={collapsed ? "Çalışmaları göster" : "Çalışmaları gizle"}
                        >
                          <span className="flex items-center gap-2 text-sm font-light">
                            <ChevronRight className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-90"}`} />
                            {format(d.date, "d MMMM yyyy, EEEE", { locale: tr })}
                          </span>
                          <span className={`text-xs tabular-nums ${d.total > 0 ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                            {d.total > 0 ? formatDur(d.total) : "—"}
                          </span>
                        </button>

                        {!collapsed && (
                          d.sessions.length > 0 ? (
                            <>
                              <div className="divide-y divide-border/40">
                                {visible.map((s) => {
                                  const cat = categories.find((c) => c.id === s.category_id);
                                  return (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2 gap-3">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-[11px] text-muted-foreground/70 tabular-nums w-10 shrink-0">
                                          {format(parseISO(s.started_at), "HH:mm")}
                                        </span>
                                        {cat && (
                                          <span className="flex items-center gap-1.5 shrink-0">
                                            <span className="h-2 w-2 rounded-full" style={{ background: colorHex(cat.color) }} />
                                            <span className="text-xs text-muted-foreground">{cat.name}</span>
                                          </span>
                                        )}
                                        {s.note && (
                                          <span className="text-xs font-light truncate">
                                            {cat && <span className="text-muted-foreground/40 mx-1">·</span>}
                                            {s.note}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                        {formatDur(s.duration_seconds)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {d.sessions.length > 3 && (
                                <button
                                  onClick={() => setExpandedSessionsByDay((s) => ({ ...s, [d.key]: !sessionsExpanded }))}
                                  className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-border/40 hover:bg-accent/20"
                                >
                                  {sessionsExpanded
                                    ? "Daha az göster"
                                    : `Devamını göster (+${d.sessions.length - 3})`}
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="px-3 py-3 text-[11px] text-muted-foreground/50 italic">Kayıt yok</div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => setRecentWeeks((w) => w + 1)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                  >
                    Devamını göster
                  </button>
                </div>
              </div>
              )}
            </div>
          </main>
        </div>
  );
};

const WorkHistoryOverviewLoading = () => (
  <div className="space-y-5">
    <div className="space-y-3 rounded-sm border border-border/50 bg-card/20 p-3" aria-busy="true">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <LoadingBlock lines={1} className="max-w-[11rem] flex-1" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-md bg-muted/70 animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted/70 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LoadingCard lines={2} />
        <LoadingCard lines={2} />
        <LoadingCard lines={2} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <LoadingCard lines={4} />
      <LoadingCard lines={4} />
      <LoadingCard lines={4} />
    </div>

    <div className="border border-border/60 rounded-sm p-3" aria-busy="true">
      <div className="flex items-center justify-between mb-3">
        <LoadingBlock lines={1} className="w-36" />
        <div className="h-3 w-24 rounded-sm bg-muted/60 animate-pulse" />
      </div>
      <div className="h-48 rounded-sm bg-muted/40 animate-pulse" />
    </div>
  </div>
);

const GroupedHistoryLoading = () => (
  <div className="space-y-2" aria-busy="true">
    <LoadingBlock lines={1} className="w-20 px-1 mb-3" />
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="border border-border/60 rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-card/40">
          <LoadingBlock lines={1} className="w-36" />
          <div className="h-3 w-16 rounded-sm bg-muted/60 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const RecentDaysLoading = ({ recentWeeks }: { recentWeeks: number }) => (
  <div aria-busy="true">
    <h2 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
      Son {recentWeeks} Hafta — Günlük
    </h2>
    <div className="flex flex-wrap items-center gap-1.5 mb-4 px-1">
      <div className="h-6 w-16 rounded-sm bg-muted/50 animate-pulse" />
      <div className="h-6 w-20 rounded-sm bg-muted/50 animate-pulse" />
      <div className="h-6 w-24 rounded-sm bg-muted/50 animate-pulse" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border border-border/60 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-card/40 border-b border-border/60">
            <LoadingBlock lines={1} className="w-44" />
            <div className="h-3 w-10 rounded-sm bg-muted/60 animate-pulse" />
          </div>
          <div className="px-3 py-3">
            <LoadingBlock lines={2} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingCard = ({ lines }: { lines: number }) => (
  <div className="rounded-sm border border-border/50 bg-background/40 p-3">
    <LoadingBlock lines={lines} />
  </div>
);

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="border border-border/60 rounded-sm p-3">
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">{label}</div>
    <div className="text-lg font-light tracking-wide tabular-nums">{value}</div>
    {hint ? <div className="text-[10px] text-muted-foreground/60 mt-1">{hint}</div> : null}
  </div>
);

export default WorkHistory;
