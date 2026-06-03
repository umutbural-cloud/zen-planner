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
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (authLoading || !editor) return;
      if (!userId || !projectId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data: existing, error: selectError } = await supabase
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (selectError) throw selectError;

        let n = existing;
        if (!n) {
          const { data: created, error: insertError } = await supabase
            .from("notes")
            .insert({ project_id: projectId, user_id: userId, title: "", content: "" })
            .select()
            .single();

          if (insertError) throw insertError;
          n = created;
        }

        if (!active) return;
        if (!n) {
          setError("Not oluşturulamadı.");
          return;
        }

        setNote(n);
        setTitle(n.title || "");
        editor.commands.setContent(n.content ? safeParse(n.content) : "");
      } catch (err) {
        console.error("Not yüklenemedi:", err);
        if (active) setError("Not yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [authLoading, projectId, userId, editor]);

  // Debounced save on editor changes
  useEffect(() => {
    if (!editor || !note || !userId) return;
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSaving(true);
        try {
          const json = JSON.stringify(editor.getJSON());
          const { error: updateError } = await supabase
            .from("notes")
            .update({ content: json })
            .eq("id", note.id)
            .eq("user_id", userId);

          if (updateError) throw updateError;
        } catch (err) {
          console.error("Not içeriği kaydedilemedi:", err);
          setError("Not kaydedilemedi. Lütfen tekrar deneyin.");
        } finally {
          setSaving(false);
        }
      }, 600);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      clearTimeout(timer);
    };
  }, [editor, note, userId]);

  useEffect(() => {
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!note || !userId) return;
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(async () => {
      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from("notes")
          .update({ title: value })
          .eq("id", note.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } catch (err) {
        console.error("Not başlığı kaydedilemedi:", err);
        setError("Not başlığı kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">Yükleniyor...</div>;
  if (error) return <div className="text-center text-destructive text-sm py-12">{error}</div>;

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
        {saving ? "Kaydediliyor..." : "Kaydedildi"}
      </div>
    </div>
  );
};

function safeParse(s: string): JSONContent | string {
  try { return JSON.parse(s); } catch { return s; }
}

export default NotesView;
