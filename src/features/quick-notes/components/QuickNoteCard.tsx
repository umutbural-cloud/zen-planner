import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Palette, Pin, PinOff, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotebookNote, QuickNoteColor } from "@/features/knowledge/types";
import { isJsonObject, quickDocFromJson, quickTextFromJson } from "@/features/knowledge/lib/noteContent";
import { QuickNoteEditor } from "./QuickNoteEditor";

type NoteUpdate = Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned">>;

const COLOR_TOKENS: { key: QuickNoteColor; label: string; bg: string; ring: string }[] = [
  { key: "default", label: "Varsayılan", bg: "bg-card", ring: "border-border/70" },
  { key: "yellow", label: "Sarı", bg: "bg-yellow-100/70 dark:bg-yellow-900/25", ring: "border-yellow-300/60" },
  { key: "green", label: "Yeşil", bg: "bg-emerald-100/70 dark:bg-emerald-900/25", ring: "border-emerald-300/60" },
  { key: "blue", label: "Mavi", bg: "bg-sky-100/70 dark:bg-sky-900/25", ring: "border-sky-300/60" },
  { key: "pink", label: "Pembe", bg: "bg-pink-100/70 dark:bg-pink-900/25", ring: "border-pink-300/60" },
  { key: "purple", label: "Mor", bg: "bg-violet-100/70 dark:bg-violet-900/25", ring: "border-violet-300/60" },
  { key: "stone", label: "Taş", bg: "bg-stone-200/60 dark:bg-stone-800/40", ring: "border-stone-300/60" },
];

const tokenFor = (color: QuickNoteColor) =>
  COLOR_TOKENS.find((token) => token.key === color) || COLOR_TOKENS[0];

export const QuickNoteCard = ({
  note,
  onUpdate,
  onDelete,
}: {
  note: NotebookNote;
  onUpdate: (id: string, updates: NoteUpdate) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const [title, setTitle] = useState(note.title || "");
  const debounceRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const tone = tokenFor(note.color);
  const noteText = quickTextFromJson(note.content);
  const noteDoc = quickDocFromJson(note.content);

  useEffect(() => {
    if (!focusedRef.current) {
      setTitle(note.title || "");
    }
  }, [note.title]);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  const flushTitle = (nextTitle = title) => {
    const updates: NoteUpdate = {};
    if (nextTitle !== (note.title || "")) updates.title = nextTitle;
    if (Object.keys(updates).length) onUpdate(note.id, updates);
  };

  const queueTitleFlush = (nextTitle: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => flushTitle(nextTitle), 600);
  };

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.58 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`group relative rounded-sm border ${tone.bg} ${tone.ring} p-3 transition-colors hover:border-foreground/15`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-2 rounded-sm p-1 text-muted-foreground/35 opacity-0 transition hover:bg-accent/40 hover:text-muted-foreground group-hover:opacity-100 focus:opacity-100 cursor-grab active:cursor-grabbing"
        title="Sırala"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <input
        value={title}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => {
          focusedRef.current = false;
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          flushTitle();
        }}
        onChange={(event) => {
          setTitle(event.target.value);
          queueTitleFlush(event.target.value);
        }}
        placeholder="Başlık"
        className="w-full bg-transparent pl-3 pr-7 text-[13px] font-normal tracking-wide outline-none placeholder:text-muted-foreground/35"
      />

      <div className="mt-3">
        <QuickNoteEditor
          doc={noteDoc}
          text={noteText}
          onChange={(doc, text) => onUpdate(note.id, {
            content: { ...(isJsonObject(note.content) ? note.content : {}), doc, text },
          })}
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
          className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
          title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
        >
          {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-accent/40 hover:text-foreground" title="Renk">
              <Palette className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <div className="grid grid-cols-7 gap-1">
              {COLOR_TOKENS.map((token) => (
                <button
                  key={token.key}
                  onClick={() => onUpdate(note.id, { color: token.key })}
                  title={token.label}
                  className={`flex h-6 w-6 items-center justify-center rounded-sm border ${token.bg} ${token.ring} transition hover:bg-accent/20`}
                >
                  {note.color === token.key && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button
          onClick={() => onDelete(note.id)}
          className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-accent/40 hover:text-destructive"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {note.pinned && (
        <Pin className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/50 transition group-hover:opacity-0" />
      )}
    </article>
  );
};
