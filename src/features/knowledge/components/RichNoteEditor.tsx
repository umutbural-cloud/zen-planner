import { type ChangeEvent, type ReactNode, useEffect, useRef } from "react";
import { useEditor, EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, ListTree, ChevronRight } from "lucide-react";

const lowlight = createLowlight(common);

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggleBlock: () => ReturnType;
    };
  }
}

type Props = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
};

const TbBtn = ({ onClick, active, title, children }: ToolbarButtonProps) => (
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

const ToggleBlockView = ({ node, updateAttributes }: NodeViewProps) => {
  const open = (node.attrs.open as boolean | undefined) ?? true;
  const title = (node.attrs.title as string | undefined) || "";

  const handleToggle = () => {
    updateAttributes({ open: !open });
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: event.target.value });
  };

  return (
    <NodeViewWrapper className="notion-toggle" data-open={open ? "true" : "false"}>
      <div className="notion-toggle-header" contentEditable={false}>
        <button type="button" className="notion-toggle-button" onClick={handleToggle} title={open ? "Kapat" : "Aç"}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Toggle"
          className="notion-toggle-title"
        />
      </div>
      <NodeViewContent className="notion-toggle-content" />
    </NodeViewWrapper>
  );
};

const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block*",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") || "",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({ "data-open": attributes.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle-block" }),
      ["div", { "data-toggle-fallback-title": "" }, HTMLAttributes["data-title"] || ""],
      ["div", { "data-toggle-content": "" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },

  addCommands() {
    return {
      insertToggleBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: "", open: true },
            content: [
              {
                type: "paragraph",
              },
            ],
          }),
    };
  },
});

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  const debounceRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      ToggleBlock,
      Placeholder.configure({ placeholder: placeholder || "Yazmaya başla, ya da bir blok ekle..." }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value && Object.keys(value || {}).length ? value : { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "rich-note-editor focus:outline-none font-light leading-[1.85] text-[15px] prose-rich",
      },
      handleDOMEvents: {
        copy: () => false,
        cut: () => false,
        paste: () => false,
        keydown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && ["c", "x", "v", "a", "z", "y"].includes(event.key.toLowerCase())) {
            return false;
          }
          return false;
        },
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
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 pt-2 sm:pt-3 pb-12">
      <input
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="w-full bg-transparent outline-none text-3xl sm:text-4xl font-light tracking-wide mb-6 pr-10 placeholder:text-muted-foreground/30"
        style={{ fontFamily: '"Noto Serif JP", serif' }}
      />

      <div className="sticky top-0 z-10 -mx-6 sm:-mx-12 px-6 sm:px-12 py-1 mb-3 flex flex-wrap items-center gap-0.5 bg-background/80 backdrop-blur-sm border-b border-border/40 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-3.5 w-3.5" /></TbBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın"><Bold className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik"><Italic className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={insertLink} active={editor.isActive("link")} title="Bağlantı"><LinkIcon className="h-3.5 w-3.5" /></TbBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde"><List className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Sıralı"><ListOrdered className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Alıntı"><Quote className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Kod bloğu"><Code2 className="h-3.5 w-3.5" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().insertToggleBlock().run()} active={editor.isActive("toggleBlock")} title="Toggle"><ListTree className="h-3.5 w-3.5" /></TbBtn>
      </div>

      <div className="min-h-[60vh]" onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault();
      }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichNoteEditor;
