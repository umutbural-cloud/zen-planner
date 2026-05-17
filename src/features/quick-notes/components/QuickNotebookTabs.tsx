import { useEffect, useRef, useState } from "react";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import type { QuickNoteNotebook } from "../types";

export const QuickNotebookTabs = ({
  notebooks,
  activeNotebookId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  notebooks: QuickNoteNotebook[];
  activeNotebookId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) => {
  const active = notebooks.find((notebook) => notebook.id === activeNotebookId) || null;
  const [title, setTitle] = useState(active?.title || "");
  const lastActiveId = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastActiveId.current !== active?.id) {
      setTitle(active?.title || "");
      lastActiveId.current = active?.id || null;
    }
  }, [active?.id, active?.title]);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  const rename = (value: string) => {
    setTitle(value);
    if (!active) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => onRename(active.id, value), 500);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {notebooks.map((notebook) => {
          const selected = notebook.id === activeNotebookId;

          return (
            <div
              key={notebook.id}
              className={`group/notebook inline-flex min-h-8 items-center rounded-sm border text-xs font-light transition ${
                selected
                  ? "border-foreground/15 bg-accent text-accent-foreground"
                  : "border-border/70 bg-background/80 text-muted-foreground hover:border-foreground/15 hover:text-foreground"
              }`}
            >
              <button
                onClick={() => onSelect(notebook.id)}
                className="inline-flex min-h-8 items-center gap-2 px-2.5"
              >
                <StickyNote className="h-3.5 w-3.5" />
                <span className="max-w-36 truncate">{notebook.title}</span>
              </button>
              <button
                onClick={() => onDelete(notebook.id)}
                className="mr-1 rounded-sm p-1 text-muted-foreground opacity-0 transition hover:bg-accent/50 hover:text-destructive group-hover/notebook:opacity-100 focus:opacity-100"
                title="Defteri sil"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={onCreate}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border/70 bg-background/80 text-muted-foreground transition hover:border-foreground/15 hover:text-foreground"
          title="Yeni anlık not defteri"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {active && (
        <input
          value={title}
          onBlur={() => onRename(active.id, title)}
          onChange={(event) => rename(event.target.value)}
          className="w-full max-w-md bg-transparent text-xl font-light tracking-wide outline-none placeholder:text-muted-foreground/35"
          placeholder="Defter adı"
        />
      )}
    </div>
  );
};
