import { type ChangeEvent, useEffect, useRef } from "react";
import { useEditor, EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { ChevronRight } from "lucide-react";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";

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
      FontSize,
      LineHeight,
      Placeholder.configure({ placeholder: placeholder || "Yazmaya başla, ya da bir blok ekle..." }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value && Object.keys(value || {}).length ? value : { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "rich-note-editor focus:outline-none font-light leading-[1.85] text-[12px] prose-rich",
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

      <div className="sticky top-0 z-10 -mx-6 sm:-mx-12 px-6 sm:px-12 py-1 mb-3 bg-background/80 backdrop-blur-sm opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <RichTextToolbar
          editor={editor}
          features={{ link: true, taskList: false, codeBlock: true, toggleBlock: true, history: false }}
          onInsertLink={insertLink}
          onInsertToggleBlock={() => editor.chain().focus().insertToggleBlock().run()}
        />
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
