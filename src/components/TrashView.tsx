import { useMemo, useState } from "react";
import {
  Trash2,
  RotateCcw,
  FileText,
  Folder,
  CheckCircle2,
  BookOpen,
  Package,
  StickyNote,
  TimerReset,
  Search,
  ListTodo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrash, TrashItem } from "@/hooks/useTrash";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const kindMeta: Record<TrashItem["kind"], { label: string; icon: LucideIcon }> = {
  task: { label: "Görev", icon: CheckCircle2 },
  note: { label: "Not", icon: FileText },
  quick_note: { label: "Anlık Not", icon: StickyNote },
  project: { label: "Proje", icon: Folder },
  journal: { label: "Günlük", icon: BookOpen },
  backlog: { label: "Heybe", icon: Package },
  pomodoro_session: { label: "Pomodoro", icon: TimerReset },
};

const mobileGroups: Array<{ key: string; label: string; kinds: TrashItem["kind"][]; icon: LucideIcon }> = [
  { key: "pomodoro", label: "Pomodoro Seansları", kinds: ["pomodoro_session"], icon: TimerReset },
  { key: "tasks", label: "Görevler", kinds: ["task"], icon: CheckCircle2 },
  { key: "notes", label: "Notlar", kinds: ["note", "quick_note"], icon: FileText },
  { key: "projects", label: "Projeler", kinds: ["project"], icon: Folder },
  { key: "journal", label: "Günlük", kinds: ["journal"], icon: BookOpen },
  { key: "backlog", label: "Backlog", kinds: ["backlog"], icon: ListTodo },
];

const formatDeletedAt = (value: string) => format(parseISO(value), "d MMM HH:mm", { locale: tr });

const TrashView = () => {
  const { items, loading, restore, purge, purgeAll } = useTrash();
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLocaleLowerCase("tr");
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const meta = kindMeta[item.kind];
      const haystack = `${item.title} ${meta.label} ${formatDeletedAt(item.deleted_at)}`.toLocaleLowerCase("tr");
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const groupedItems = useMemo(
    () =>
      mobileGroups
        .map((group) => ({
          ...group,
          items: filteredItems.filter((item) => group.kinds.includes(item.kind)),
        }))
        .filter((group) => group.items.length > 0),
    [filteredItems]
  );

  const noSearchResults = items.length > 0 && filteredItems.length === 0;

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">Yükleniyor...</div>;

  return (
    <>
      <div className="md:hidden">
        <div className="mx-auto w-full max-w-md min-w-0 space-y-5 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Çöp Kutusu</h1>
              <p className="mt-1 text-xs text-muted-foreground">Silinen öğeler 30 gün burada kalır.</p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={purgeAll}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              >
                Hepsini boşalt
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Çöpte ara..."
              className="w-full rounded-2xl border border-border/50 bg-muted/40 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:bg-card"
            />
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">Çöp kutusu temiz</p>
              <p className="mt-1 text-xs text-muted-foreground">Silinen öğeler burada listelenir.</p>
            </div>
          ) : noSearchResults ? (
            <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">Sonuç bulunamadı</p>
              <p className="mt-1 text-xs text-muted-foreground">Arama terimini değiştirerek tekrar deneyin.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedItems.map((group) => (
                <section key={group.key}>
                  <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
                    {group.label}
                  </div>
                  <div className="border-y border-border/60 divide-y divide-border/50">
                    {group.items.map((item) => {
                      const meta = kindMeta[item.kind];
                      const Icon = group.icon;
                      return (
                        <div key={`${item.kind}-${item.id}`} className="flex min-w-0 items-center justify-between gap-3 px-1 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <Icon className="h-5 w-5 shrink-0 text-primary/70" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium leading-tight text-foreground">{item.title}</p>
                              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                                {meta.label} · {formatDeletedAt(item.deleted_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => restore(item)}
                              aria-label="Geri yükle"
                              title="Geri yükle"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => purge(item)}
                              aria-label="Kalıcı olarak sil"
                              title="Kalıcı olarak sil"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
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
              <p className="mb-1">Boş</p>
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
                      {formatDeletedAt(item.deleted_at)}
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
      </div>
    </>
  );
};

export default TrashView;
