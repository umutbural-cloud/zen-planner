import { Trash2, RotateCcw, FileText, Folder, ListChecks, BookOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrash, TrashItem } from "@/hooks/useTrash";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const kindMeta: Record<TrashItem["kind"], { label: string; icon: any }> = {
  task: { label: "Görev", icon: ListChecks },
  note: { label: "Not", icon: FileText },
  project: { label: "Proje", icon: Folder },
  journal: { label: "Günlük", icon: BookOpen },
  backlog: { label: "Heybe", icon: Package },
};

const TrashView = () => {
  const { items, loading, restore, purge, purgeAll } = useTrash();

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Çöp Kutusu</div>
          <h1 className="text-3xl font-light tracking-wide mt-1">Çöp Kutusu</h1>
          <p className="text-xs text-muted-foreground mt-1 font-light">
            Silinen öğeler 30 gün burada kalır, sonra kalıcı olarak silinir.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={purgeAll} className="text-xs text-muted-foreground hover:text-destructive">
            Hepsini boşalt
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Çöp kutusu temiz</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          {items.map((item) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            return (
              <div key={`${item.kind}-${item.id}`} className="group flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0 hover:bg-card/40 transition-colors">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] tracking-wide uppercase text-muted-foreground/70 w-14">{meta.label}</span>
                <span className="text-sm font-light flex-1 truncate">{item.title}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  {format(parseISO(item.deleted_at), "d MMM HH:mm", { locale: tr })}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => restore(item)} className="p-1 text-muted-foreground hover:text-foreground" title="Geri yükle">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => purge(item)} className="p-1 text-muted-foreground hover:text-destructive" title="Kalıcı sil">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashView;
