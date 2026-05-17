import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Bold, Italic, Code, Link as LinkIcon, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, Table as TableIcon } from "lucide-react";

const lowlight = createLowlight(common);

type Props = {
  value: any;
  onChange: (doc: any) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

const TbBtn = ({ onClick, active, title, children }: any) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
  >
    {children}
  </button>
);

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  const debounceRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: placeholder || "Yazmaya başla, ya da bir blok ekle..." }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value && Object.keys(value || {}).length ? value : { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[60vh] font-light leading-[1.85] text-[15px] prose-rich",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        onChange(editor.getJSON());
      }, 500);
    },
  });

  // Sync external content changes (e.g., switching note)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value) && value) {
      editor.commands.setContent(value && Object.keys(value).length ? value : { type: "doc", content: [{ type: "paragraph" }] }, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const insertLink = () => {
    const url = window.prompt("URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 py-12 sm:py-16">
      <input
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="w-full bg-transparent outline-none text-3xl sm:text-4xl font-light tracking-wide mb-8 placeholder:text-muted-foreground/30"
        style={{ fontFamily: '"Noto Serif JP", serif' }}
      />

      <div className="sticky top-0 z-10 -mx-6 sm:-mx-12 px-6 sm:px-12 py-1 mb-3 flex flex-wrap items-center gap-0.5 bg-background/80 backdrop-blur-sm border-b border-border/40 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-3.5 w-3.5" /></TbBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın"><Bold className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik"><Italic className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Kod"><Code className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={insertLink} active={editor.isActive("link")} title="Bağlantı"><LinkIcon className="h-3.5 w-3.5" /></TbBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde"><List className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Sıralı"><ListOrdered className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Alıntı"><Quote className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Kod bloğu"><Code2 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tablo"><TableIcon className="h-3.5 w-3.5" /></TbBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichNoteEditor;
