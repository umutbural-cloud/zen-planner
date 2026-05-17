import { useState } from "react";
import { useNotebooks } from "../hooks/useNotebooks";
import { NOTE_TYPES } from "../registry/noteTypes";
import type { NoteType } from "../types";

const NotebookView = ({ notebookId }: { notebookId: string }) => {
  const { notebooks } = useNotebooks();
  const notebook = notebooks.find((n) => n.id === notebookId);
  const [activeType, setActiveType] = useState<NoteType>("quick");

  if (!notebook) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p className="text-xs">Defter bulunamadı</p>
      </div>
    );
  }

  const ActiveDef = NOTE_TYPES.find((t) => t.key === activeType) || NOTE_TYPES[0];
  const Panel = ActiveDef.Panel;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg tracking-wide font-light" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            {notebook.name}
          </h2>
          <p className="text-[11px] text-muted-foreground/70 font-light mt-1">知 — Bilgi Merkezi defteri</p>
        </div>
        <nav className="flex items-center gap-0.5 border-b border-border/60">
          {NOTE_TYPES.map((t) => {
            const Icon = t.icon;
            const active = t.key === activeType;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs tracking-wide font-light transition-colors border-b -mb-px ${
                  active
                    ? "border-foreground/70 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                <span className="text-muted-foreground/50 text-[9px] ml-1">{t.jp}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        <Panel notebookId={notebook.id} />
      </div>
    </div>
  );
};

export default NotebookView;
