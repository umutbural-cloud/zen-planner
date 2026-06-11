import { useEffect } from "react";
import { ExternalLink, Link2Off, Pencil } from "lucide-react";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";

type LinkPopoverProps = {
  href: string;
  rect: DOMRect;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

const shortenHref = (href: string) => {
  if (href.length <= 56) return href;
  return `${href.slice(0, 32)}...${href.slice(-16)}`;
};

export const LinkPopover = ({ href, rect, onClose, onEdit, onRemove }: LinkPopoverProps) => {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-link-popover='true']")) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const openHref = () => {
    const safeHref = normalizeSafeLinkUrl(href);
    if (!safeHref) return;
    window.open(safeHref, "_blank", "noopener,noreferrer");
    onClose();
  };

  const top = Math.max(8, rect.top - 48);
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - 320));

  return (
    <div
      data-link-popover="true"
      className="fixed z-50 flex max-w-[320px] items-center gap-1 rounded-md border border-border/70 bg-background/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur-sm"
      style={{ top, left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="min-w-0 max-w-[150px] truncate text-muted-foreground" title={href}>
        {shortenHref(href)}
      </span>
      <button
        type="button"
        onClick={openHref}
        className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Aç
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        Düzenle
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <Link2Off className="h-3.5 w-3.5" />
        Kaldır
      </button>
    </div>
  );
};
