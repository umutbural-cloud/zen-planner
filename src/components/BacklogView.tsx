import { useState } from "react";
import { Plus, Trash2, ArrowRight, ArrowUp, ArrowDown, ChevronsUpDown, Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBacklog, BacklogTask, Priority, Urgency } from "@/hooks/useBacklog";
import { useProjects, Project } from "@/hooks/useProjects";

const priorityMeta: Record<Priority, { label: string; color: string; rank: number }> = {
  high: { label: "Yüksek", color: "text-red-700", rank: 0 },
  medium: { label: "Orta", color: "text-amber-700", rank: 1 },
  low: { label: "Düşük", color: "text-stone-500", rank: 2 },
};

const urgencyMeta: Record<Urgency, { label: string; jp: string; rank: number }> = {
  today: { label: "Bugün", jp: "今日", rank: 0 },
  this_week: { label: "Bu hafta", jp: "今週", rank: 1 },
  someday: { label: "Bir gün", jp: "いつか", rank: 2 },
};

const MoveMenu = ({ projects, onMove }: { projects: Project[]; onMove: (pid: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Projeye taşı"
      >
        <ArrowRight className="h-3 w-3" />
        <span>Taşı</span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-1 max-h-72 overflow-auto" align="end">
      {projects.length === 0 ? (
        <div className="text-xs text-muted-foreground p-2">Önce bir proje oluşturun</div>
      ) : projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onMove(p.id)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors text-left"
        >
          <span>{p.emoji}</span>
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </PopoverContent>
  </Popover>
);

const BacklogRow = ({ item, projects, onUpdate, onDelete, onMove }: {
  item: BacklogTask;
  projects: Project[];
  onUpdate: (id: string, updates: Partial<BacklogTask>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, projectId: string) => void;
}) => {
  return (
    <>
      {/* Desktop / tablet row */}
      <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-card/40 transition-colors">
        <Input
          value={item.title}
          onChange={(e) => onUpdate(item.id, { title: e.target.value })}
          className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
        />
        <Select value={item.priority} onValueChange={(v) => onUpdate(item.id, { priority: v as Priority })}>
          <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["high","medium","low"] as Priority[]).map((p) => (
              <SelectItem key={p} value={p}><span className={priorityMeta[p].color}>{priorityMeta[p].label}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={item.urgency} onValueChange={(v) => onUpdate(item.id, { urgency: v as Urgency })}>
          <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["today","this_week","someday"] as Urgency[]).map((u) => (
              <SelectItem key={u} value={u}>{urgencyMeta[u].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={item.due_date || ""}
          onChange={(e) => onUpdate(item.id, { due_date: e.target.value || null })}
          className="h-7 w-32 text-xs bg-transparent border-none p-0"
        />
        <div className="flex items-center gap-1">
          <MoveMenu projects={projects} onMove={(pid) => onMove(item.id, pid)} />
          <button
            onClick={() => onDelete(item.id)}
            className="text-muted-foreground hover:text-destructive p-1"
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-3 py-2.5 border-b border-border/40 hover:bg-card/40 transition-colors space-y-2">
        <Input
          value={item.title}
          onChange={(e) => onUpdate(item.id, { title: e.target.value })}
          placeholder="Başlık..."
          className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={item.priority} onValueChange={(v) => onUpdate(item.id, { priority: v as Priority })}>
            <SelectTrigger className="h-7 w-[88px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["high","medium","low"] as Priority[]).map((p) => (
                <SelectItem key={p} value={p}><span className={priorityMeta[p].color}>{priorityMeta[p].label}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={item.urgency} onValueChange={(v) => onUpdate(item.id, { urgency: v as Urgency })}>
            <SelectTrigger className="h-7 w-[96px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["today","this_week","someday"] as Urgency[]).map((u) => (
                <SelectItem key={u} value={u}>{urgencyMeta[u].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={item.due_date || ""}
            onChange={(e) => onUpdate(item.id, { due_date: e.target.value || null })}
            className="h-7 w-[140px] text-xs"
          />
          <div className="ml-auto flex items-center gap-1">
            <MoveMenu projects={projects} onMove={(pid) => onMove(item.id, pid)} />
            <button
              onClick={() => onDelete(item.id)}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-sm hover:bg-destructive/10"
              title="Sil"
              aria-label="Görevi sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

type SortKey = "title" | "priority" | "urgency" | "due_date" | null;
type SortDir = "asc" | "desc";

const HeaderCell = <T extends string>({
  label,
  width,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  filterOptions,
  filterValue,
  onFilter,
  align = "left",
}: {
  label: string;
  width?: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  filterOptions?: { value: T | "all"; label: string }[];
  filterValue?: T | "all";
  onFilter?: (v: T | "all") => void;
  align?: "left" | "center";
}) => {
  const active = currentSort === sortKey;
  const filterActive = filterValue && filterValue !== "all";
  return (
    <div className={`flex items-center gap-1 ${width || ""} ${align === "center" ? "justify-center" : ""}`}>
      <button
        onClick={() => sortKey && onSort(sortKey)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        {active ? (
          currentDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
      {filterOptions && onFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`p-0.5 rounded-sm hover:bg-accent transition-colors ${filterActive ? "text-foreground" : "opacity-40 hover:opacity-100"}`}
              title="Filtrele"
            >
              <Filter className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="start">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFilter(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors text-left"
              >
                {filterValue === opt.value ? <Check className="h-3 w-3" /> : <span className="w-3" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

const BacklogView = () => {
  const { items, loading, createItem, updateItem, deleteItem, moveToProject } = useBacklog();
  const { projects } = useProjects();
  const [newTitle, setNewTitle] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterUrgency, setFilterUrgency] = useState<Urgency | "all">("all");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createItem({ title: newTitle.trim() });
    setNewTitle("");
  };

  const handleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  let filtered = items;
  if (filterPriority !== "all") filtered = filtered.filter((i) => i.priority === filterPriority);
  if (filterUrgency !== "all") filtered = filtered.filter((i) => i.urgency === filterUrgency);

  const sorted = [...filtered];
  if (sortKey) {
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title, "tr");
      else if (sortKey === "priority") cmp = priorityMeta[a.priority].rank - priorityMeta[b.priority].rank;
      else if (sortKey === "urgency") cmp = urgencyMeta[a.urgency].rank - urgencyMeta[b.urgency].rank;
      else if (sortKey === "due_date") {
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = a.due_date.localeCompare(b.due_date);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Heybe</div>
        <h1 className="text-3xl font-light tracking-wide mt-1">Heybe</h1>
        <p className="text-xs text-muted-foreground mt-1 font-light max-w-prose">
          Karmaşık alan. Tüm görevleri, fikirleri buraya at; öncelik ver, sırala, sonra projelere taşıyıp sade alanlarda çalış.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Heybeye bir görev at..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Heybede iş yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2 border-b border-border/60 text-[10px] tracking-wide uppercase text-muted-foreground bg-card/30">
            <HeaderCell label="Başlık" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <HeaderCell
              label="Öncelik"
              width="w-24"
              sortKey="priority"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              filterOptions={[
                { value: "all", label: "Tümü" },
                { value: "high", label: "Yüksek" },
                { value: "medium", label: "Orta" },
                { value: "low", label: "Düşük" },
              ]}
              filterValue={filterPriority}
              onFilter={(v) => setFilterPriority(v as any)}
            />
            <HeaderCell
              label="Aciliyet"
              width="w-24"
              sortKey="urgency"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              filterOptions={[
                { value: "all", label: "Tümü" },
                { value: "today", label: "Bugün" },
                { value: "this_week", label: "Bu hafta" },
                { value: "someday", label: "Bir gün" },
              ]}
              filterValue={filterUrgency}
              onFilter={(v) => setFilterUrgency(v as any)}
            />
            <HeaderCell label="Bitiş" width="w-32" sortKey="due_date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <span className="w-20"></span>
          </div>
          {sorted.map((item) => (
            <BacklogRow
              key={item.id}
              item={item}
              projects={projects}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onMove={moveToProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BacklogView;
