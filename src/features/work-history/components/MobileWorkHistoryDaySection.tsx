import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { addSeconds, format, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";

export type MobileWorkHistoryEntry = {
  id: string;
  title: string;
  subtitle: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  color?: string | null;
};

type MobileWorkHistoryDaySectionProps = {
  date: Date;
  totalSeconds: number;
  entries: MobileWorkHistoryEntry[];
  footer?: ReactNode;
  emptyLabel?: string;
  onRequestDelete?: (entryId: string) => void;
  onRequestEdit?: (entryId: string) => void;
  openSwipe?: OpenSwipeState;
  onOpenSwipeChange?: (next: OpenSwipeState) => void;
};

const FALLBACK_BAR_COLOR = "hsl(var(--muted-foreground) / 0.35)";
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_INTENT_THRESHOLD = 10;

export type SwipeSide = "edit" | "delete";
export type OpenSwipeState = {
  id: string;
  side: SwipeSide;
} | null;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  intent: "pending" | "horizontal" | "vertical";
};

const formatDayHeading = (date: Date) => {
  if (isToday(date)) return `Bugün, ${format(date, "d MMMM", { locale: tr })}`;
  if (isYesterday(date)) return `Dün, ${format(date, "d MMMM", { locale: tr })}`;
  return format(date, "d MMMM, EEEE", { locale: tr });
};

const formatCompactDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}s ${minutes}d`;
  if (hours > 0) return `${hours}s`;
  if (minutes > 0) return `${minutes}d`;
  return `${safeSeconds}s`;
};

const formatTimeRange = (entry: MobileWorkHistoryEntry) => {
  const start = parseISO(entry.startedAt);
  const end = entry.endedAt ? parseISO(entry.endedAt) : addSeconds(start, entry.durationSeconds);
  return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
};

const getOpenOffset = (entryId: string, openSwipe: OpenSwipeState) => {
  if (openSwipe?.id !== entryId) return 0;
  return openSwipe.side === "edit" ? SWIPE_ACTION_WIDTH : -SWIPE_ACTION_WIDTH;
};

const clampSwipe = (value: number) => Math.max(-SWIPE_ACTION_WIDTH, Math.min(SWIPE_ACTION_WIDTH, value));

const MobileWorkHistoryRowContent = ({ entry }: { entry: MobileWorkHistoryEntry }) => (
  <>
    <span
      className="h-11 w-1.5 shrink-0 rounded-full"
      style={{ background: entry.color || FALLBACK_BAR_COLOR }}
      aria-hidden="true"
    />
    <div className="min-w-0 flex-1">
      <p className="line-clamp-2 text-sm font-medium leading-snug tracking-[-0.01em] text-foreground">
        {entry.title}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {entry.subtitle}
      </p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {formatCompactDuration(entry.durationSeconds)}
      </p>
      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
        {formatTimeRange(entry)}
      </p>
    </div>
  </>
);

const SwipeableMobileWorkHistoryRow = ({
  entry,
  openSwipe,
  onOpenSwipeChange,
  onRequestDelete,
  onRequestEdit,
}: {
  entry: MobileWorkHistoryEntry;
  openSwipe: OpenSwipeState;
  onOpenSwipeChange: (next: OpenSwipeState) => void;
  onRequestDelete?: (entryId: string) => void;
  onRequestEdit?: (entryId: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const openOffset = getOpenOffset(entry.id, openSwipe);
  const currentOffset = isDragging ? dragX : openOffset;
  const isOpen = openSwipe?.id === entry.id;
  const activeSide: SwipeSide | null = isDragging
    ? currentOffset > 0
      ? "edit"
      : currentOffset < 0
        ? "delete"
        : null
    : isOpen
      ? openSwipe?.side ?? null
      : null;
  const editVisible = activeSide === "edit";
  const deleteVisible = activeSide === "delete";

  const capturePointer = (event: PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not guaranteed on every browser/input combination.
    }
  };

  const releasePointer = (pointerId: number) => {
    try {
      rowRef.current?.releasePointerCapture(pointerId);
    } catch {
      // Ignore missing captures; pointer cancel can arrive after release.
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (openSwipe && openSwipe.id !== entry.id) onOpenSwipeChange(null);
    capturePointer(event);
    const startOffset = getOpenOffset(entry.id, openSwipe);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset,
      intent: "pending",
    };
    setDragX(startOffset);
    setIsDragging(false);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.intent === "pending") {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absY > absX && absY > SWIPE_INTENT_THRESHOLD) {
        drag.intent = "vertical";
        setIsDragging(false);
        return;
      }
      if (absX < SWIPE_INTENT_THRESHOLD) return;
      drag.intent = "horizontal";
      suppressClickRef.current = true;
      setIsDragging(true);
    }

    if (drag.intent !== "horizontal") return;
    setDragX(clampSwipe(drag.startOffset + deltaX));
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    releasePointer(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);

    if (drag.intent !== "horizontal") {
      setDragX(0);
      return;
    }

    const finalX = clampSwipe(drag.startOffset + event.clientX - drag.startX);
    if (finalX >= SWIPE_ACTION_WIDTH) {
      onOpenSwipeChange({ id: entry.id, side: "edit" });
    } else if (finalX <= -SWIPE_ACTION_WIDTH) {
      onOpenSwipeChange({ id: entry.id, side: "delete" });
    } else {
      onOpenSwipeChange(null);
    }
    setDragX(0);
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>) => {
    releasePointer(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  const handleRowClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isOpen) onOpenSwipeChange(null);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 flex items-stretch justify-between">
        <button
          type="button"
          aria-label="Pomodoro kaydını düzenle"
          tabIndex={editVisible ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSwipeChange(null);
            onRequestEdit?.(entry.id);
          }}
          className={`flex w-[72px] shrink-0 items-center justify-center bg-accent text-foreground transition-opacity ${
            editVisible ? "pointer-events-auto opacity-100 hover:bg-accent/80" : "pointer-events-none opacity-0"
          }`}
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Pomodoro kaydını sil"
          tabIndex={deleteVisible ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSwipeChange(null);
            onRequestDelete?.(entry.id);
          }}
          className={`flex w-[72px] shrink-0 items-center justify-center bg-destructive text-destructive-foreground transition-opacity ${
            deleteVisible ? "pointer-events-auto opacity-100 hover:bg-destructive/90" : "pointer-events-none opacity-0"
          }`}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onClick={handleRowClick}
        className={`relative z-10 flex min-h-[72px] items-center gap-3 bg-card px-3.5 py-3 ${
          isDragging ? "" : "transition-transform duration-200 ease-out"
        }`}
        style={{ transform: `translateX(${currentOffset}px)`, touchAction: "pan-y" }}
      >
        <MobileWorkHistoryRowContent entry={entry} />
      </div>
    </div>
  );
};

export const MobileWorkHistoryDaySection = ({
  date,
  totalSeconds,
  entries,
  footer,
  emptyLabel = "Kayıt yok",
  onRequestDelete,
  onRequestEdit,
  openSwipe,
  onOpenSwipeChange,
}: MobileWorkHistoryDaySectionProps) => {
  const [internalOpenSwipe, setInternalOpenSwipe] = useState<OpenSwipeState>(null);
  const isSwipeControlled = openSwipe !== undefined;
  const activeOpenSwipe = isSwipeControlled ? openSwipe : internalOpenSwipe;
  const setOpenSwipe = onOpenSwipeChange ?? setInternalOpenSwipe;
  const hasSwipeActions = Boolean(onRequestDelete && onRequestEdit);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-medium tracking-[-0.01em] text-foreground">
          {formatDayHeading(date)}
        </h3>
        <span className="shrink-0 rounded-full border border-border/60 bg-muted/45 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          Toplam: {totalSeconds > 0 ? formatCompactDuration(totalSeconds) : "—"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        {entries.length > 0 ? (
          <div className="divide-y divide-border/45">
            {entries.map((entry) => (
              hasSwipeActions ? (
                <SwipeableMobileWorkHistoryRow
                  key={entry.id}
                  entry={entry}
                  openSwipe={activeOpenSwipe}
                  onOpenSwipeChange={setOpenSwipe}
                  onRequestDelete={onRequestDelete}
                  onRequestEdit={onRequestEdit}
                />
              ) : (
                <div key={entry.id} className="flex min-h-[72px] items-center gap-3 px-3.5 py-3">
                  <MobileWorkHistoryRowContent entry={entry} />
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 text-xs italic text-muted-foreground/60">{emptyLabel}</div>
        )}
        {footer ? <div className="border-t border-border/45">{footer}</div> : null}
      </div>
    </section>
  );
};
