import type { JSONContent } from "@tiptap/react";
import { RichEditorSurface } from "@/components/editor/RichEditorSurface";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
  placeholder?: string;
  titleValue: string;
  onTitleChange: (v: string) => void;
};

const RichNoteEditor = ({ value, onChange, placeholder, titleValue, onTitleChange }: Props) => {
  return (
    <div className="max-w-[760px] mx-auto w-full px-6 sm:px-12 pt-2 sm:pt-3 pb-12 xl:relative xl:-left-[104px] 2xl:-left-[110px]">
      <input
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Başlıksız"
        className="w-full bg-transparent outline-none text-3xl sm:text-4xl font-light tracking-wide mb-6 pr-10 placeholder:text-muted-foreground/30"
        style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
      />

      <RichEditorSurface value={value} onChange={onChange} placeholder={placeholder} resetKey="rich-note-editor" />
    </div>
  );
};

export default RichNoteEditor;
