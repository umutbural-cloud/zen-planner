import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { createRichEditorExtensions } from "@/components/editor/createRichEditorExtensions";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";
import { BubbleTextMenu } from "@/components/editor/BubbleTextMenu";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { EMPTY_RICH_DOC, ensureSafeRichDoc } from "@/features/knowledge/lib/noteContent";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

type SurfaceProps = Pick<Props, "value" | "onChange" | "placeholder">;

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class RichEditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("RichNoteEditor rendering failed.", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-sm border border-border/70 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          Editör içeriği yüklenemedi. Bu test sürümünde eski içerik uyumsuz olabilir.
        </div>
      );
    }

    return this.props.children;
  }
}

const RichNoteEditorSurface = ({ value, onChange, placeholder }: SurfaceProps) => {
  const debounceRef = useRef<number | null>(null);
  const lastEmittedJsonRef = useRef<string | null>(null);
  const lastLocalEditAtRef = useRef(0);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const safeValue = useMemo(() => ensureSafeRichDoc(value), [value]);
  const safeValueJson = useMemo(() => JSON.stringify(safeValue), [safeValue]);

  const editor = useEditor({
    extensions: createRichEditorExtensions({
      placeholder: placeholder || "Yazmaya başla, ya da bir blok ekle...",
      linkClassName: "",
    }),
    content: safeValue,
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
      lastLocalEditAtRef.current = Date.now();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const nextDoc = editor.getJSON();
        lastEmittedJsonRef.current = JSON.stringify(nextDoc);
        onChange(nextDoc);
      }, 500);
    },
  });

  // Sync external content changes (e.g., switching note)
  useEffect(() => {
    if (!editor) return;
    if (lastEmittedJsonRef.current === safeValueJson) return;

    const current = editor.getJSON();
    const currentJson = JSON.stringify(current);
    const isRecentLocalEdit = Date.now() - lastLocalEditAtRef.current < 5000;

    if (editor.isFocused && isRecentLocalEdit) return;

    if (currentJson !== safeValueJson) {
      try {
        editor.commands.setContent(safeValue, { emitUpdate: false });
      } catch (error) {
        console.warn("RichNoteEditor content sync failed. Falling back to an empty document.", error);
        editor.commands.setContent(EMPTY_RICH_DOC, { emitUpdate: false });
      }
    }
  }, [editor, safeValue, safeValueJson]);

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
    <>
      <div className="sticky top-0 z-10 -mx-6 sm:-mx-12 px-6 sm:px-12 py-1 mb-3 bg-background/80 backdrop-blur-sm opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {isToolbarCollapsed ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={() => setIsToolbarCollapsed(false)}
            className="rounded-sm border border-border/70 bg-background/80 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            aria-label="Araç çubuğunu göster"
          >
            Araçları göster
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <RichTextToolbar
                editor={editor}
                features={{ link: true, taskList: false, codeBlock: true, details: true, history: false }}
                onInsertLink={insertLink}
                onInsertDetails={() => editor.chain().focus().setDetails().run()}
              />
            </div>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => setIsToolbarCollapsed(true)}
              className="shrink-0 rounded-sm border border-border/70 bg-background/80 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              aria-label="Araç çubuğunu gizle"
            >
              Gizle
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[60vh]" onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault();
      }}>
        <EditorContent editor={editor} />
      </div>

      {editor ? <BubbleTextMenu editor={editor} onSetLink={insertLink} /> : null}
      {editor ? <LinkBubbleMenu editor={editor} /> : null}
    </>
  );
};

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  return (
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 pt-2 sm:pt-3 pb-12">
      <input
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="w-full bg-transparent outline-none text-3xl sm:text-4xl font-light tracking-wide mb-6 pr-10 placeholder:text-muted-foreground/30"
        style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
      />

      <RichEditorErrorBoundary resetKey="rich-note-editor">
        <RichNoteEditorSurface value={value} onChange={onChange} placeholder={placeholder} />
      </RichEditorErrorBoundary>
    </div>
  );
};

export default RichNoteEditor;
