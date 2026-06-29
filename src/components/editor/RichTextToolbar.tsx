import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTree,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  FONT_SIZES,
  LINE_HEIGHTS,
} from "./richTextExtensions";

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
};

type Props = {
  editor: Editor | null;
  compact?: boolean;
  sticky?: boolean;
  mobileSingleRow?: boolean;
  features?: {
    headings?: boolean;
    strike?: boolean;
    taskList?: boolean;
    blockquote?: boolean;
    codeBlock?: boolean;
    details?: boolean;
    link?: boolean;
    history?: boolean;
    fontSize?: boolean;
    lineHeight?: boolean;
    orderedList?: boolean;
    headingLevels?: number[];
  };
  onInsertLink?: () => void;
  onInsertDetails?: () => void;
};

const ToolbarButton = ({ onClick, active, title, children }: ToolbarButtonProps) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    title={title}
    className={`rounded-sm p-1.5 transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div data-toolbar-divider className="mx-0.5 h-4 w-px bg-border/60" />;

const selectClass =
  "h-7 rounded-sm border border-border/60 bg-transparent px-1.5 text-xs font-light text-muted-foreground outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus:text-foreground";

export const RichTextToolbar = ({
  editor,
  compact = false,
  sticky = false,
  mobileSingleRow = false,
  features = {},
  onInsertLink,
  onInsertDetails,
}: Props) => {
  const [selectedFontSize, setSelectedFontSize] = useState(DEFAULT_FONT_SIZE);
  const [selectedLineHeight, setSelectedLineHeight] = useState(DEFAULT_LINE_HEIGHT);

  const enabled = {
    headings: true,
    strike: true,
    taskList: true,
    blockquote: true,
    codeBlock: false,
    details: false,
    link: false,
    history: true,
    fontSize: true,
    lineHeight: true,
    orderedList: true,
    headingLevels: [1, 2, 3],
    ...features,
  };

  useEffect(() => {
    if (!editor) return;

    const syncControls = () => {
      const fontSize = editor.getAttributes("fontSize").size;
      const lineHeight =
        editor.getAttributes("paragraph").lineHeight ||
        editor.getAttributes("heading").lineHeight ||
        editor.getAttributes("listItem").lineHeight ||
        editor.getAttributes("blockquote").lineHeight;

      setSelectedFontSize(
        typeof fontSize === "string" && FONT_SIZES.includes(fontSize as (typeof FONT_SIZES)[number])
          ? fontSize
          : DEFAULT_FONT_SIZE
      );
      setSelectedLineHeight(
        typeof lineHeight === "string" && LINE_HEIGHTS.some((option) => option.value === lineHeight)
          ? lineHeight
          : DEFAULT_LINE_HEIGHT
      );
    };

    syncControls();
    editor.on("selectionUpdate", syncControls);
    editor.on("update", syncControls);

    return () => {
      editor.off("selectionUpdate", syncControls);
      editor.off("update", syncControls);
    };
  }, [editor]);

  if (!editor) return null;

  const setFontSize = (size: string) => {
    setSelectedFontSize(size);
    const chain = editor.chain().focus();
    if (size === DEFAULT_FONT_SIZE) {
      chain.unsetFontSize().run();
      return;
    }
    chain.setFontSize(size).run();
  };

  const setLineHeight = (lineHeight: string) => {
    setSelectedLineHeight(lineHeight);
    editor.chain().focus().setLineHeight(lineHeight).run();
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 border-b border-border/60 pb-2 ${
        compact ? "mb-2" : "mb-4"
      } ${sticky ? "sticky top-0 z-10 bg-background/80 backdrop-blur-sm" : ""} ${
        mobileSingleRow
          ? "mb-0 min-w-max flex-nowrap border-b-0 pb-0 [&>button]:shrink-0 [&>select]:shrink-0 [&>[data-toolbar-divider]]:shrink-0 md:mb-4 md:flex-wrap md:border-b md:pb-2"
          : ""
      }`}
    >
      {enabled.headings && (
        <>
          {enabled.headingLevels.includes(1) && (
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Başlık 1">
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          {enabled.headingLevels.includes(2) && (
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Başlık 2">
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          {enabled.headingLevels.includes(3) && (
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Başlık 3">
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          <Divider />
        </>
      )}

      {enabled.fontSize && (
        <select value={selectedFontSize} onChange={(event) => setFontSize(event.target.value)} title="Font boyutu" className={selectClass}>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      )}
      {enabled.lineHeight && (
        <select value={selectedLineHeight} onChange={(event) => setLineHeight(event.target.value)} title="Satır aralığı" className={selectClass}>
          {LINE_HEIGHTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {(enabled.fontSize || enabled.lineHeight) && <Divider />}

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      {enabled.strike && (
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Üstü çizili">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      {enabled.link && (
        <ToolbarButton onClick={onInsertLink || (() => {})} active={editor.isActive("link")} title="Bağlantı">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde">
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      {enabled.orderedList && (
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Sıralı liste">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      {enabled.taskList && (
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Yapılacaklar">
          <CheckSquare className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      {enabled.blockquote && (
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Alıntı">
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      {enabled.codeBlock && (
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Kod bloğu">
          <Code2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      {enabled.details && (
        <ToolbarButton onClick={onInsertDetails || (() => {})} active={editor.isActive("details")} title="Toggle">
          <ListTree className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}

      {enabled.history && (
        <>
          <Divider />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Geri al">
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Yinele">
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
};
