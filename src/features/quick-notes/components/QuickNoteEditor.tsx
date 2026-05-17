import { useEffect, useRef } from "react";
import type React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading3, Italic, List, ListOrdered } from "lucide-react";

type QuickNoteDoc = Record<string, unknown>;

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const textToDoc = (text: string) => ({
  type: "doc",
  content: text
    ? text.split("\n").map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : undefined,
      }))
    : [{ type: "paragraph" }],
});

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    title={title}
    className={`rounded-sm p-1 transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

export const QuickNoteEditor = ({
  doc,
  text,
  onChange,
}: {
  doc?: QuickNoteDoc | null;
  text: string;
  onChange: (doc: QuickNoteDoc, text: string) => void;
}) => {
  const debounceRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>("");
  const initialContent = doc && Object.keys(doc).length ? doc : textToDoc(text);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: "Düşünceyi yakala..." }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "quick-note-editor focus:outline-none min-h-24 text-[13px] font-light leading-[1.72] text-foreground/90",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        onChange(editor.getJSON(), editor.getText());
      }, 550);
    },
  });

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const next = JSON.stringify(doc && Object.keys(doc).length ? doc : textToDoc(text));
    if (lastContentRef.current === next) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== next) editor.commands.setContent(JSON.parse(next), { emitUpdate: false });
    lastContentRef.current = next;
  }, [doc, editor, text]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0.5 border-b border-border/50 pb-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Alt başlık">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Sıralı madde">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
