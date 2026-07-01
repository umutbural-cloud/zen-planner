import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy,
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import JournalCompletedTasks from "./JournalCompletedTasks";
import JournalWorkSessions from "./JournalWorkSessions";
import JournalHabits from "./JournalHabits";
import { RichEditorSurface } from "@/components/editor/RichEditorSurface";
import { EMPTY_RICH_DOC, ensureSafeRichDoc } from "@/features/knowledge/lib/noteContent";
import { MobileWorkHistoryDaySection, type MobileWorkHistoryEntry } from "@/features/work-history/components/MobileWorkHistoryDaySection";

type WorkSession = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
  category_id: string | null;
};

const textToDoc = (text: string): JSONContent => ({
  type: "doc",
  content: text
    ? text.split("\n").map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : undefined,
      }))
    : [{ type: "paragraph" }],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const journalContentToDoc = (content: string | null | undefined): JSONContent => {
  if (!content) return EMPTY_RICH_DOC;

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "string") return textToDoc(parsed);
    if (isRecord(parsed) && parsed.type === "doc") return ensureSafeRichDoc(parsed as JSONContent);
    return textToDoc(content);
  } catch {
    return textToDoc(content);
  }
};

const KEYBOARD_OPEN_THRESHOLD = 80;
const KEYBOARD_TOOLBAR_GAP = 6;
const KEYBOARD_SAVE_STATUS_OFFSET = "3.65rem";
const CLOSED_TOOLBAR_BOTTOM = "calc(4.75rem + env(safe-area-inset-bottom))";
const CLOSED_SAVE_STATUS_BOTTOM = "calc(8.15rem + env(safe-area-inset-bottom))";

const JournalView = ({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) => {
  const { user } = useAuth();
  const { categories } = usePomodoroCategories();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [entryDoc, setEntryDoc] = useState<JSONContent>(EMPTY_RICH_DOC);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [workSessionsLoading, setWorkSessionsLoading] = useState(false);
  const [keyboardState, setKeyboardState] = useState({ inset: 0, open: false });
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentDate = parseISO(date);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setEntryId(null);
      const { data: existing } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", date)
        .is("deleted_at", null)
        .maybeSingle();

      let n = existing;
      if (!n) {
        const { data: created } = await supabase
          .from("journal_entries")
          .insert({ user_id: user.id, entry_date: date, content: "" })
          .select()
          .single();
        n = created;
      }
      if (!active || !n) return;
      setEntryId(n.id);
      setEntryDoc(journalContentToDoc(n.content));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [date, user]);

  useEffect(() => {
    let active = true;
    const loadWorkSessions = async () => {
      if (!user) {
        setWorkSessions([]);
        return;
      }

      setWorkSessionsLoading(true);
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      const { data } = await supabase
        .from("pomodoro_sessions")
        .select("id, started_at, ended_at, duration_seconds, kind, note, category_id")
        .eq("user_id", user.id)
        .eq("kind", "work")
        .is("deleted_at", null)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .order("started_at", { ascending: false });

      if (!active) return;
      setWorkSessions((data || []) as WorkSession[]);
      setWorkSessionsLoading(false);
    };

    loadWorkSessions();
    const handler = () => loadWorkSessions();
    window.addEventListener("pomodoro:session-saved", handler);
    return () => {
      active = false;
      window.removeEventListener("pomodoro:session-saved", handler);
    };
  }, [date, user]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      saveTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardState({
        inset: Math.round(inset),
        open: inset > KEYBOARD_OPEN_THRESHOLD,
      });
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  const handleEditorChange = useCallback((doc: JSONContent) => {
    setEntryDoc(doc);
    if (!entryId || !user) return;

    if (saveTimersRef.current[entryId]) clearTimeout(saveTimersRef.current[entryId]);
    saveTimersRef.current[entryId] = setTimeout(async () => {
      setSaving(true);
      const json = JSON.stringify(doc);
      await supabase.from("journal_entries").update({ content: json }).eq("id", entryId).eq("user_id", user.id);
      delete saveTimersRef.current[entryId];
      setSaving(false);
    }, 600);
  }, [entryId, user]);

  const shift = (n: number) => onDateChange(format(addDays(currentDate, n), "yyyy-MM-dd"));
  const activityEntries = useMemo<MobileWorkHistoryEntry[]>(() => {
    return workSessions.map((session) => {
      const category = categories.find((item) => item.id === session.category_id);
      const note = session.note?.trim();
      return {
        id: session.id,
        title: note || "Odak çalışması",
        subtitle: category?.name || "Kategorisiz",
        startedAt: session.started_at,
        endedAt: session.ended_at,
        durationSeconds: session.duration_seconds,
        color: category ? colorHex(category.color) : undefined,
      };
    });
  }, [categories, workSessions]);
  const activityTotalSeconds = workSessions.reduce((total, session) => total + session.duration_seconds, 0);
  const mobileToolbarBottom = keyboardState.open
    ? `calc(${keyboardState.inset}px + ${KEYBOARD_TOOLBAR_GAP}px)`
    : CLOSED_TOOLBAR_BOTTOM;
  const saveStatusBottom = keyboardState.open
    ? `calc(${keyboardState.inset}px + ${KEYBOARD_SAVE_STATUS_OFFSET})`
    : CLOSED_SAVE_STATUS_BOTTOM;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 hidden items-center justify-between gap-3 md:mb-6 md:flex">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="min-h-10 min-w-10 rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground md:min-h-0 md:min-w-0 md:rounded-sm md:p-1.5" title="Önceki gün">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent/50 md:min-h-0 md:rounded-sm md:py-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-left">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Günlük</div>
                  <div className="text-lg font-light tracking-wide sm:text-2xl">
                    {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={currentDate}
                onSelect={(d) => {
                  if (d) {
                    onDateChange(format(d, "yyyy-MM-dd"));
                    setPickerOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <button onClick={() => shift(1)} className="min-h-10 min-w-10 rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground md:min-h-0 md:min-w-0 md:rounded-sm md:p-1.5" title="Sonraki gün">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
          className="min-h-10 rounded-lg px-3 text-[10px] uppercase tracking-wide text-muted-foreground hover:bg-accent/40 hover:text-foreground md:min-h-0 md:rounded-sm"
        >
          Bugün
        </button>
      </div>

      <div className="md:hidden">
        <header className="flex min-h-14 items-center gap-3 border-b border-border/60 px-4">
          <SidebarTrigger className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-base font-light tracking-wide">Günlük</h1>
          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            aria-label="Bugünkü yapılanları göster"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <Trophy className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </header>
        <div className="mb-5 space-y-3 px-4 pt-3">
          <div className="flex items-center justify-between gap-1 rounded-xl border border-border/50 bg-card/65 px-1.5 py-1.5">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              title="Önceki gün"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-center transition-colors hover:bg-accent/40">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-light tracking-wide">
                    {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(d) => {
                    if (d) {
                      onDateChange(format(d, "yyyy-MM-dd"));
                      setPickerOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => shift(1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              title="Sonraki gün"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">Yükleniyor...</div>
      ) : (
        <>
          <RichEditorSurface
            key={entryId ?? date}
            value={entryDoc}
            onChange={handleEditorChange}
            placeholder="Bugün için yaz..."
            resetKey={entryId ?? date}
            mobileToolbarBottom
            mobileToolbarStyle={{ bottom: mobileToolbarBottom }}
            className="md:block"
            contentClassName="min-h-[calc(100dvh-19rem)] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] md:min-h-[60vh] md:px-0 md:pb-0"
            editorClassName="text-[15px] leading-[1.9] md:text-[12px] md:leading-[1.85]"
          />
          <div
            className="fixed inset-x-4 bottom-[calc(8.15rem+env(safe-area-inset-bottom))] z-30 text-right text-[10px] tracking-wide text-muted-foreground md:static md:mt-6 md:text-left"
            style={{ bottom: saveStatusBottom }}
          >
            {saving ? "Kaydediliyor..." : "Kaydedildi"}
          </div>
          <div className="hidden md:block">
            <JournalWorkSessions date={date} />
            <JournalHabits date={date} />
            <JournalCompletedTasks date={date} />
          </div>
        </>
      )}

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent side="right" className="w-[88vw] overflow-y-auto p-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-sm">
          <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
            <SheetTitle className="text-base font-light tracking-wide">Bugün Yapılanlar</SheetTitle>
            <SheetDescription>
              {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 py-5">
            {workSessionsLoading ? (
              <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-5 text-sm text-muted-foreground">
                Kayıtlar yükleniyor...
              </div>
            ) : (
              <MobileWorkHistoryDaySection
                date={currentDate}
                totalSeconds={activityTotalSeconds}
                entries={activityEntries}
                emptyLabel="Bugün henüz kayıt yok"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default JournalView;
