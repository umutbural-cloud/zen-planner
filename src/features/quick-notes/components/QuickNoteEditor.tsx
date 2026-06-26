import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";

const textToDoc = (text: string): JSONContent => ({
  type: "doc",
  content: text
    ? text.split("\n").map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : undefined,
      }))
    : [{ type: "paragraph" }],
});

export const QuickNoteEditor = ({
  doc,
  text,
  onChange,
}: {
  doc?: JSONContent | null;
  text: string;
  onChange: (doc: JSONContent, text: string) => void;
}) => {
  const debounceRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>("");
  const pendingContentRef = useRef<{ doc: JSONContent; text: string } | null>(null);
  const onChangeRef = useRef(onChange);
  const initialContent = doc && Object.keys(doc).length ? doc : textToDoc(text);

  const flushPendingContent = () => {
    if (!pendingContentRef.current) return;
    const pending = pendingContentRef.current;
    pendingContentRef.current = null;
    onChangeRef.current(pending.doc, pending.text);
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      FontSize,
      LineHeight,
      Placeholder.configure({ placeholder: "Düşünceyi yakala..." }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "quick-note-editor focus:outline-none min-h-24 text-[12px] font-light leading-[1.72] text-foreground/90",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      pendingContentRef.current = { doc: editor.getJSON(), text: editor.getText() };
      flushPendingContent();
    },
  });

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const pending = pendingContentRef.current;
    if (!pending) return;
    pendingContentRef.current = null;
    onChangeRef.current(pending.doc, pending.text);
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
      <RichTextToolbar
        editor={editor}
        compact
        features={{
          headingLevels: [3],
          strike: false,
          taskList: false,
          blockquote: false,
          history: false,
          fontSize: false,
          lineHeight: false,
          orderedList: false,
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
};
