import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { BubbleTextMenu } from "@/components/editor/BubbleTextMenu";
import { createRichEditorExtensions } from "@/components/editor/createRichEditorExtensions";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { LinkPopover } from "@/components/editor/LinkPopover";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { cn } from "@/lib/utils";
import { EMPTY_RICH_DOC, ensureSafeRichDoc } from "@/features/knowledge/lib/noteContent";

type RichEditorSurfaceProps = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  editorClassName?: string;
  resetKey?: string;
  mobileToolbarBottom?: boolean;
};

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
    console.warn("Rich editor rendering failed.", error, info);
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

const RichEditorSurfaceInner = ({
  value,
  onChange,
  placeholder,
  className,
  contentClassName,
  editorClassName,
  mobileToolbarBottom = false,
}: RichEditorSurfaceProps) => {
  const debounceRef = useRef<number | null>(null);
  const lastEmittedJsonRef = useRef<string | null>(null);
  const lastLocalEditAtRef = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  const [linkPopover, setLinkPopover] = useState<{
    href: string;
    rect: DOMRect;
    range: { from: number; to: number };
  } | null>(null);
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
        class: cn(
          "rich-note-editor focus:outline-none font-light leading-[1.85] text-[12px] prose-rich",
          editorClassName,
        ),
      },
      handleDOMEvents: {
        click: (_view, event) => {
          const activeEditor = editorRef.current;
          const target = event.target;
          if (!activeEditor || !(target instanceof Element)) return false;

          const anchor = target.closest<HTMLAnchorElement>(".ProseMirror a[href]");
          if (!anchor) return false;

          event.preventDefault();

          const position = activeEditor.view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!position) return true;

          activeEditor.chain().focus().setTextSelection(position.pos).extendMarkRange("link").run();
          const { from, to } = activeEditor.state.selection;
          setLinkPopover({
            href: anchor.getAttribute("href") || "",
            rect: anchor.getBoundingClientRect(),
            range: { from, to },
          });

          return true;
        },
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

  editorRef.current = editor;

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

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
        console.warn("Rich editor content sync failed. Falling back to an empty document.", error);
        editor.commands.setContent(EMPTY_RICH_DOC, { emitUpdate: false });
      }
    }
  }, [editor, safeValue, safeValueJson]);

  if (!editor) return null;

  const selectLinkRange = (range: { from: number; to: number }) => {
    editor.chain().focus().setTextSelection(range).extendMarkRange("link").run();
  };

  const insertLink = (initialUrl = "") => {
    const { from, to } = editor.state.selection;
    const url = window.prompt("URL", initialUrl);
    if (!url) return;
    const safeUrl = normalizeSafeLinkUrl(url);
    if (!safeUrl) {
      console.warn("Invalid or unsafe link URL rejected.");
      return;
    }
    editor.chain().focus().setTextSelection({ from, to }).extendMarkRange("link").setLink({ href: safeUrl }).run();
  };

  return (
    <div className={className}>
      <div
        className={cn(
          "sticky top-0 z-10 -mx-6 mb-3 bg-background/80 px-6 py-1 opacity-60 backdrop-blur-sm transition-opacity hover:opacity-100 focus-within:opacity-100 sm:-mx-12 sm:px-12",
          mobileToolbarBottom &&
            "fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] top-auto z-40 mx-0 mb-0 rounded-xl border border-border/70 bg-background/95 px-3 py-2 opacity-100 shadow-lg md:sticky md:inset-auto md:top-0 md:-mx-12 md:mb-3 md:rounded-none md:border-0 md:bg-background/80 md:px-12 md:py-1 md:shadow-none",
        )}
      >
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
          <div
            className={cn(
              "flex items-center gap-2",
              mobileToolbarBottom &&
                "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible",
            )}
          >
            <div className={cn("min-w-0 flex-1", mobileToolbarBottom && "min-w-max flex-none md:min-w-0 md:flex-1")}>
              <RichTextToolbar
                editor={editor}
                features={{ link: true, taskList: false, codeBlock: true, details: true, history: false }}
                onInsertLink={insertLink}
                onInsertDetails={() => editor.chain().focus().setDetails().run()}
                mobileSingleRow={mobileToolbarBottom}
              />
            </div>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => setIsToolbarCollapsed(true)}
              className={cn(
                "shrink-0 rounded-sm border border-border/70 bg-background/80 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
                mobileToolbarBottom && "min-h-8 whitespace-nowrap rounded-lg px-3 md:min-h-0 md:rounded-sm md:px-2",
              )}
              aria-label="Araç çubuğunu gizle"
            >
              Gizle
            </button>
          </div>
        )}
      </div>

      <div
        className={cn("min-h-[60vh]", contentClassName)}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) event.preventDefault();
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <BubbleTextMenu editor={editor} onSetLink={insertLink} />
      {linkPopover ? (
        <LinkPopover
          href={linkPopover.href}
          rect={linkPopover.rect}
          onClose={() => setLinkPopover(null)}
          onEdit={() => {
            selectLinkRange(linkPopover.range);
            setLinkPopover(null);
            insertLink(linkPopover.href);
          }}
          onRemove={() => {
            selectLinkRange(linkPopover.range);
            editor.chain().focus().unsetLink().run();
            setLinkPopover(null);
          }}
        />
      ) : null}
      <LinkBubbleMenu editor={editor} />
    </div>
  );
};

export const RichEditorSurface = (props: RichEditorSurfaceProps) => (
  <RichEditorErrorBoundary resetKey={props.resetKey || "rich-editor-surface"}>
    <RichEditorSurfaceInner {...props} />
  </RichEditorErrorBoundary>
);
