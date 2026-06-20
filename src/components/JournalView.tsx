import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import JournalCompletedTasks from "./JournalCompletedTasks";
import JournalWorkSessions from "./JournalWorkSessions";
import JournalHabits from "./JournalHabits";
import { RichEditorSurface } from "@/components/editor/RichEditorSurface";
import { EMPTY_RICH_DOC, ensureSafeRichDoc } from "@/features/knowledge/lib/noteContent";

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

const JournalView = ({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) => {
  const { user } = useAuth();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [entryDoc, setEntryDoc] = useState<JSONContent>(EMPTY_RICH_DOC);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      saveTimersRef.current = {};
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/50" title="Önceki gün">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-accent/50 transition-colors">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-left">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Günlük</div>
                  <div className="text-2xl font-light tracking-wide">
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
          <button onClick={() => shift(1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/50" title="Sonraki gün">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
          className="text-[10px] tracking-wide text-muted-foreground hover:text-foreground uppercase"
        >
          Bugün
        </button>
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
          />
          <div className="text-[10px] text-muted-foreground mt-6 tracking-wide">
            {saving ? "Kaydediliyor..." : "Kaydedildi"}
          </div>
          <JournalWorkSessions date={date} />
          <JournalHabits date={date} />
          <JournalCompletedTasks date={date} />
        </>
      )}
    </div>
  );
};

export default JournalView;
