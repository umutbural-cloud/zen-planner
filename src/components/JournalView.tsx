import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
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
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";

function safeParse(s: string): JSONContent | string {
  try { return JSON.parse(s); } catch { return s; }
}

const JournalView = ({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) => {
  const { user } = useAuth();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentDate = parseISO(date);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      FontSize,
      LineHeight,
      Placeholder.configure({ placeholder: "Bugün için yaz..." }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "focus:outline-none min-h-[60vh] text-[12px] font-light leading-relaxed" },
    },
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || !editor) return;
      setLoading(true);
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
      editor.commands.setContent(n.content ? safeParse(n.content) : "");
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [date, user, editor]);

  useEffect(() => {
    if (!editor || !entryId || !user) return;
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSaving(true);
        const json = JSON.stringify(editor.getJSON());
        await supabase.from("journal_entries").update({ content: json }).eq("id", entryId).eq("user_id", user.id);
        setSaving(false);
      }, 600);
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); clearTimeout(timer); };
  }, [editor, entryId, user]);

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
          <RichTextToolbar editor={editor} sticky />
          <EditorContent editor={editor} />
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
