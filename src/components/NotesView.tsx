import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Quote,
  Strikethrough,
  Undo,
  Redo,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

type Note = {
  id: string;
  title: string;
  content: string;
};

const ToolbarButton = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm transition-colors ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 pb-2 mb-4 sticky top-0 bg-background z-10">
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Başlık 1">
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Başlık 2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Başlık 3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <div className="w-px h-4 bg-border/60 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Üstü çizili">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <div className="w-px h-4 bg-border/60 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde">
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Sıralı liste">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Yapılacaklar">
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Alıntı">
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <div className="w-px h-4 bg-border/60 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Geri al">
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Yinele">
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
};

const NotesView = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Notunuzu yazın..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[60vh] font-light leading-relaxed",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (!note) return;
    const t = setTimeout(async () => {
      setSaving(true);
      await supabase.from("notes").update({ title: value }).eq("id", note.id);
      setSaving(false);
    }, 600);
    return () => clearTimeout(t);
  }, [note]);

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="bg-transparent border-none p-0 h-auto text-3xl font-light tracking-wide focus-visible:ring-0 mb-4"
      />
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="text-[10px] text-muted-foreground mt-6 tracking-wide">
        {saving ? "保存中..." : "保存済み"}
      </div>
    </div>
  );
};

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return s; }
}

export default NotesView;
