import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";

type Note = {
  id: string;
  title: string;
  content: string;
};

const NotesView = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      FontSize,
      LineHeight,
      Placeholder.configure({ placeholder: "Notunuzu yazın..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[60vh] text-[12px] font-light leading-relaxed",
      },
    },
  });

  // Load or create the note for this project
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || !projectId || !editor) return;
      setLoading(true);
      const { data: existing } = await supabase
        .from("notes")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let n = existing;
      if (!n) {
        const { data: created } = await supabase
          .from("notes")
          .insert({ project_id: projectId, user_id: user.id, title: "", content: "" })
          .select()
          .single();
        n = created;
      }
      if (!active || !n) return;
      setNote(n);
      setTitle(n.title || "");
      editor.commands.setContent(n.content ? safeParse(n.content) : "");
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [projectId, user, editor]);

  // Debounced save on editor changes
  useEffect(() => {
    if (!editor || !note) return;
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSaving(true);
        const json = JSON.stringify(editor.getJSON());
        await supabase.from("notes").update({ content: json }).eq("id", note.id);
        setSaving(false);
      }, 600);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      clearTimeout(timer);
    };
  }, [editor, note]);

  useEffect(() => {
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!note) return;
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from("notes").update({ title: value }).eq("id", note.id);
      setSaving(false);
    }, 600);
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="bg-transparent border-none p-0 h-auto text-3xl font-light tracking-wide focus-visible:ring-0 mb-4"
      />
      <RichTextToolbar editor={editor} sticky />
      <EditorContent editor={editor} />
      <div className="text-[10px] text-muted-foreground mt-6 tracking-wide">
        {saving ? "保存中..." : "保存済み"}
      </div>
    </div>
  );
};

function safeParse(s: string): JSONContent | string {
  try { return JSON.parse(s); } catch { return s; }
}

export default NotesView;
