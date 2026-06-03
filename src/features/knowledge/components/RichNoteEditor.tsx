import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { createRichEditorExtensions } from "@/components/editor/createRichEditorExtensions";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";
import { BubbleTextMenu } from "@/components/editor/BubbleTextMenu";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  const debounceRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: createRichEditorExtensions({
      placeholder: placeholder || "Yazmaya başla, ya da bir blok ekle...",
      linkClassName: "",
    }),
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
    const { from, to } = editor.state.selection;
    const url = window.prompt("URL");
    if (!url) return;
    const safeUrl = normalizeSafeLinkUrl(url);
    if (!safeUrl) {
      console.warn("Invalid or unsafe link URL rejected.");
      return;
    }
    editor.chain().focus().setTextSelection({ from, to }).extendMarkRange("link").setLink({ href: safeUrl }).run();
  };

  return (
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 pt-2 sm:pt-3 pb-12">
      <input
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="w-full bg-transparent outline-none text-3xl sm:text-4xl font-light tracking-wide mb-6 pr-10 placeholder:text-muted-foreground/30"
        style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
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

      {editor ? <BubbleTextMenu editor={editor} onSetLink={insertLink} /> : null}
    </div>
  );
};

export default RichNoteEditor;
