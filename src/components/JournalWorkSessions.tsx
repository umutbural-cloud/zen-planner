import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clock, Filter, ArrowUpDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoroCategories, PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { colorClasses, TaskColor } from "@/lib/taskColors";
import { colorHex } from "@/hooks/useHabitCategories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type Session = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
  category_id: string | null;
};

const isoToTimeInput = (iso: string) => format(parseISO(iso), "HH:mm");
const combineDateTime = (iso: string, hhmm: string) => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = parseISO(iso);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d.toISOString();
};

type SortBy = "started_desc" | "started_asc" | "dur_desc" | "dur_asc";

const JournalWorkSessions = ({ date }: { date: string }) => {
  const { user } = useAuth();
  const { categories } = usePomodoroCategories();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("started_desc");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    const { data } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "work")
      .is("deleted_at", null)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  }, [date, user]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("pomodoro:session-saved", handler);
    return () => window.removeEventListener("pomodoro:session-saved", handler);
  }, [load]);

  const visible = useMemo(() => {
    let arr = sessions;
    if (filterCat !== "all") {
      arr = arr.filter((s) => (filterCat === "__none__" ? !s.category_id : s.category_id === filterCat));
    }
    return [...arr].sort((a, b) => {
      switch (sortBy) {
        case "started_asc": return a.started_at.localeCompare(b.started_at);
        case "dur_desc": return b.duration_seconds - a.duration_seconds;
        case "dur_asc": return a.duration_seconds - b.duration_seconds;
        default: return b.started_at.localeCompare(a.started_at);
      }
    });
  }, [sessions, filterCat, sortBy]);

  const totalSec = visible.reduce((a, s) => a + s.duration_seconds, 0);
  const totalH = Math.floor(totalSec / 3600);
  const totalM = Math.floor((totalSec % 3600) / 60);

  const updateNote = async (id: string, note: string) => {
    if (!user) return;
    await supabase.from("pomodoro_sessions").update({ note }).eq("id", id).eq("user_id", user.id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, note } : s)));
  };

  const updateTimes = async (id: string, startedAt: string, endedAt: string) => {
    if (!user) return;
    const dur = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    if (dur <= 0) { toast.error("Bitiş başlangıçtan sonra olmalı."); return; }
    await supabase.from("pomodoro_sessions").update({
      started_at: startedAt, ended_at: endedAt, duration_seconds: dur,
    }).eq("id", id).eq("user_id", user.id);
    setSessions((arr) => arr.map((s) => (s.id === id
      ? { ...s, started_at: startedAt, ended_at: endedAt, duration_seconds: dur }
      : s)));
  };

  const updateCategory = async (id: string, category_id: string | null) => {
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, category_id } : s)));
    if (!user) return;
    await supabase.from("pomodoro_sessions").update({ category_id }).eq("id", id).eq("user_id", user.id);
  };

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Clock className="h-3.5 w-3.5" />
        <span className="tracking-wide flex-1 text-left">Günlük çalışma süresi</span>
        <span className="tabular-nums text-foreground/80">
          {totalH > 0 ? `${totalH}s ` : ""}{totalM}d
        </span>
      </button>
      {open && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-card/20">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-sm border border-border/60 hover:bg-accent/50">
                  <Filter className="h-3 w-3" />
                  {filterCat === "all" ? "Tümü" : filterCat === "__none__" ? "Kategorisiz" : categories.find((c) => c.id === filterCat)?.name || "Filtre"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-44 p-1">
                <button onClick={() => setFilterCat("all")} className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCat === "all" ? "bg-accent" : ""}`}>Tümü</button>
                <button onClick={() => setFilterCat("__none__")} className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCat === "__none__" ? "bg-accent" : ""}`}>Kategorisiz</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setFilterCat(c.id)} className={`w-full flex items-center gap-2 text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${filterCat === c.id ? "bg-accent" : ""}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(c.color) }} />
                    {c.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-sm border border-border/60 hover:bg-accent/50">
                  <ArrowUpDown className="h-3 w-3" /> Sırala
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1">
                {([
                  ["started_desc", "Başlangıç (yeni → eski)"],
                  ["started_asc", "Başlangıç (eski → yeni)"],
                  ["dur_desc", "Süre (uzun → kısa)"],
                  ["dur_asc", "Süre (kısa → uzun)"],
                ] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setSortBy(k)} className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${sortBy === k ? "bg-accent" : ""}`}>{l}</button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="divide-y divide-border/40">
            {loading ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">Yükleniyor...</div>
            ) : visible.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                <p>Bu filtreyle çalışma kaydı yok</p>
              </div>
            ) : (
              visible.map((s) => (
                <Row
                  key={s.id}
                  session={s}
                  categories={categories}
                  onUpdateNote={updateNote}
                  onUpdateTimes={updateTimes}
                  onUpdateCategory={updateCategory}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Row = ({
  session, categories, onUpdateNote, onUpdateTimes, onUpdateCategory,
}: {
  session: Session;
  categories: PomodoroCategory[];
  onUpdateNote: (id: string, note: string) => void;
  onUpdateTimes: (id: string, startedAt: string, endedAt: string) => void;
  onUpdateCategory: (id: string, category_id: string | null) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(session.note || "");
  const [startVal, setStartVal] = useState(isoToTimeInput(session.started_at));
  const [endVal, setEndVal] = useState(isoToTimeInput(session.ended_at));

  useEffect(() => {
    setStartVal(isoToTimeInput(session.started_at));
    setEndVal(isoToTimeInput(session.ended_at));
    setNote(session.note || "");
  }, [session.started_at, session.ended_at, session.note]);

  const mins = Math.round(session.duration_seconds / 60);
  const cat = categories.find((c) => c.id === session.category_id);

  const commitTimes = () => {
    const newStart = combineDateTime(session.started_at, startVal);
    const newEnd = combineDateTime(session.ended_at, endVal);
    if (!newStart || !newEnd) return;
    if (newStart === session.started_at && newEnd === session.ended_at) return;
    onUpdateTimes(session.id, newStart, newEnd);
  };

  return (
    <div className="px-3 py-2">
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left text-xs hover:bg-card/40 transition-colors cursor-pointer"
      >
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-20 flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-foreground/80"
              title="Kategori"
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
          <PopoverContent align="start" className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onUpdateCategory(session.id, null)} className="w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent">Kategorisiz</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => onUpdateCategory(session.id, c.id)} className="w-full flex items-center gap-2 text-left px-2 py-1 text-xs rounded-sm hover:bg-accent">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(c.color) }} />
                {c.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="tabular-nums w-16">{mins} Dakika</span>
        {!expanded ? (
          <span className="tabular-nums text-muted-foreground w-24">
            {format(parseISO(session.started_at), "HH:mm")}-{format(parseISO(session.ended_at), "HH:mm")}
          </span>
        ) : (
          <span className="flex items-center gap-1 w-28" onClick={(e) => e.stopPropagation()}>
            <input
              type="time"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              onBlur={commitTimes}
              className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[52px]"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="time"
              value={endVal}
              onChange={(e) => setEndVal(e.target.value)}
              onBlur={commitTimes}
              className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[52px]"
            />
          </span>
        )}
        <span className="text-muted-foreground">—</span>
        {!expanded ? (
          <span className="flex-1 truncate text-muted-foreground/80">
            {note || <span className="text-muted-foreground/40">Boşluk</span>}
          </span>
        ) : (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (session.note || "") && onUpdateNote(session.id, note)}
            onClick={(e) => e.stopPropagation()}
            placeholder="ne çalıştın?"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/40"
          />
        )}
      </div>
    </div>
  );
};

export default JournalWorkSessions;
