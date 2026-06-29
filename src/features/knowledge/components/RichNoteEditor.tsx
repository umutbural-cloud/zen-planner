import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { RichEditorSurface } from "@/components/editor/RichEditorSurface";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

const KEYBOARD_OPEN_THRESHOLD = 80;
const KEYBOARD_TOOLBAR_GAP = 6;
const CLOSED_TOOLBAR_BOTTOM = "calc(4.75rem + env(safe-area-inset-bottom))";
const MAX_TITLE_LENGTH = 45;
const MAX_TITLE_LINES = 4;
const TITLE_LINE_HEIGHT_FALLBACK = 40;

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  const [keyboardState, setKeyboardState] = useState({ inset: 0, open: false });
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardState({
        inset: Math.round(inset),
        open: inset > KEYBOARD_OPEN_THRESHOLD,
      });
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  const mobileToolbarBottom = keyboardState.open
    ? `calc(${keyboardState.inset}px + ${KEYBOARD_TOOLBAR_GAP}px)`
    : CLOSED_TOOLBAR_BOTTOM;
  const limitedTitleValue = titleValue.slice(0, MAX_TITLE_LENGTH);

  const resizeTitleTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || TITLE_LINE_HEIGHT_FALLBACK;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const maxHeight = lineHeight * MAX_TITLE_LINES + paddingTop + paddingBottom;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = "hidden";
  };

  useLayoutEffect(() => {
    resizeTitleTextarea(titleTextareaRef.current);
  }, [limitedTitleValue]);

  return (
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 pt-2 sm:pt-3 pb-12 xl:relative xl:-left-[104px] 2xl:-left-[110px]">
      <textarea
        ref={titleTextareaRef}
        value={limitedTitleValue}
        onChange={(e) => {
          onTitleChange(e.target.value.slice(0, MAX_TITLE_LENGTH));
          resizeTitleTextarea(e.currentTarget);
        }}
        placeholder="Başlıksız"
        maxLength={MAX_TITLE_LENGTH}
        rows={1}
        className="mb-2 w-full max-w-full resize-none overflow-hidden break-words bg-transparent pr-10 text-3xl font-light leading-tight tracking-wide outline-none placeholder:text-muted-foreground/30 sm:text-4xl"
        style={{
          fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          overflowY: "hidden",
        }}
      />

      <RichEditorSurface
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        resetKey="rich-note-editor"
        contentClassName="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0"
        mobileToolbarBottom
        mobileToolbarStyle={{ bottom: mobileToolbarBottom }}
      />
    </div>
  );
};

export default RichNoteEditor;
