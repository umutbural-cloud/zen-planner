import type { Editor } from "@tiptap/react";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import { Bold, Code2, Italic, Link as LinkIcon, Strikethrough, Unlink } from "lucide-react";

type BubbleTextMenuProps = {
  editor: Editor;
  onSetLink: () => void;
};

const BubbleButton = ({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    title={title}
    className={`rounded-sm p-1.5 transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
  >
    {children}
  </button>
);

export const BubbleTextMenu = ({ editor, onSetLink }: BubbleTextMenuProps) => {
  const hasSelection = !editor.state.selection.empty;

  if (!editor.isEditable || !hasSelection) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: bubbleEditor }) => bubbleEditor.isEditable && !bubbleEditor.state.selection.empty}
      tippyOptions={{
        placement: "top",
        duration: 120,
        offset: [0, 10],
        animation: false,
        zIndex: 30,
      }}
      className="rounded-md border border-border/70 bg-background/95 px-1.5 py-1 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-0.5">
        <BubbleButton
          active={editor.isActive("bold")}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Kalın"
        >
          <Bold className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive("italic")}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="İtalik"
        >
          <Italic className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive("strike")}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Üstü çizili"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive("code")}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Kod"
        >
          <Code2 className="h-3.5 w-3.5" />
        </BubbleButton>
        <div className="mx-0.5 h-4 w-px bg-border/60" />
        <BubbleButton
          active={editor.isActive("link")}
          onClick={onSetLink}
          title="Bağlantı ekle/düzenle"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          active={false}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Bağlantıyı kaldır"
        >
          <Unlink className="h-3.5 w-3.5" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
};
