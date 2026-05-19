import { FileText } from "lucide-react";
import type { HomeSectionState } from "@/features/home/types";

type HomeNotePreview = {
  id: string;
  title: string;
  source: string;
  updatedLabel: string;
};

type Props = {
  notes: HomeSectionState<HomeNotePreview[]>;
};

const HomeNotesPreview = ({ notes }: Props) => {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-light tracking-wide">Notlar</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{notes.data.length}</span>
      </header>

      {notes.status === "loading" && <div className="mx-4 mb-4 h-24 rounded-xl bg-muted/40 animate-pulse" />}
      {notes.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{notes.error || "Notlar yüklenemedi."}</div>}
      {(notes.status === "empty" || notes.data.length === 0) && <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün öne çıkan not yok.</div>}
      {notes.status === "ready" && (
        <ul className="px-2 pb-2 divide-y divide-border/40">
          {notes.data.map((note) => (
            <li key={note.id} className="px-3 py-2 rounded-md hover:bg-accent/30 transition-colors">
              <div className="text-sm tracking-wide text-foreground truncate">{note.title}</div>
              <div className="mt-0.5 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                <span>{note.source}</span>
                <span>{note.updatedLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default HomeNotesPreview;
