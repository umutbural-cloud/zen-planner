import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ExternalLink, Link as LinkIcon, Unlink } from "lucide-react";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";

type LinkBubbleMenuProps = {
  editor: Editor;
};

const LinkActionButton = ({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={onClick}
    title={title}
    className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
  >
    {children}
  </button>
);

export const LinkBubbleMenu = ({ editor }: LinkBubbleMenuProps) => {
  const getSafeHref = () => {
    const href = editor.getAttributes("link").href;
    return typeof href === "string" ? normalizeSafeLinkUrl(href) : null;
  };

  const openLink = () => {
    const safeHref = getSafeHref();
    if (!safeHref) {
      console.warn("Invalid or unsafe link URL rejected.");
      return;
    }

    window.open(safeHref, "_blank", "noopener,noreferrer");
  };

  const editLink = () => {
    const currentHref = getSafeHref() ?? "";
    const nextHref = window.prompt("URL", currentHref);
    if (!nextHref) return;

    const safeHref = normalizeSafeLinkUrl(nextHref);
    if (!safeHref) {
      console.warn("Invalid or unsafe link URL rejected.");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: safeHref }).run();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: bubbleEditor }) => bubbleEditor.isEditable && bubbleEditor.isActive("link")}
      options={{
        placement: "bottom",
        offset: 8,
      }}
      className="link-bubble-menu"
    >
      <div className="flex items-center gap-1">
        <LinkActionButton onClick={openLink} title="Bağlantıyı aç">
          <ExternalLink className="h-3.5 w-3.5" />
          Aç
        </LinkActionButton>
        <LinkActionButton onClick={editLink} title="Bağlantıyı düzenle">
          <LinkIcon className="h-3.5 w-3.5" />
          Düzenle
        </LinkActionButton>
        <LinkActionButton onClick={removeLink} title="Bağlantıyı kaldır">
          <Unlink className="h-3.5 w-3.5" />
          Kaldır
        </LinkActionButton>
      </div>
    </BubbleMenu>
  );
};
