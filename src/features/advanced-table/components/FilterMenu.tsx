import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import type { TaskStatus } from "@/hooks/useTasks";
import { formatTaskStatus } from "../statusLabels";
import type { TableFilter } from "../types";

type FilterMenuProps = {
  filters: TableFilter[];
  categories: PomodoroCategory[];
  onSetTitle: (value: string) => void;
  onSetStatus: (value: "all" | TaskStatus) => void;
  onSetCategory: (value: string | "all") => void;
  onClear: () => void;
};

const getFilter = (filters: TableFilter[], columnId: TableFilter["columnId"]) =>
  filters.find((filter) => filter.columnId === columnId);

const statusValueOf = (filters: TableFilter[]): "all" | TaskStatus => {
  const filter = getFilter(filters, "status");
  if (!filter) return "all";
  if (filter.operator === "equals" && (filter.value === "todo" || filter.value === "in_progress" || filter.value === "done")) {
    return filter.value;
  }
  return "all";
};

const FilterMenu = ({ filters, categories, onSetTitle, onSetStatus, onSetCategory, onClear }: FilterMenuProps) => {
  const titleFilter = getFilter(filters, "title");
  const categoryFilter = getFilter(filters, "category");
  const statusValue = statusValueOf(filters);
  const active = filters.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-2 ${active ? "text-foreground" : "text-muted-foreground"}`}
          title="Filtre"
          aria-label="Filtre seçeneklerini aç"
        >
          <Filter className="h-3.5 w-3.5" />
          {active && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Filtreler</div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Filtreleri temizle"
          >
            <X className="h-3.5 w-3.5" />
            <span>Temizle</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Başlık</label>
            <Input
              value={titleFilter?.value || ""}
              onChange={(event) => onSetTitle(event.target.value)}
              placeholder="İçerir..."
              className="h-8 bg-transparent text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Durum</div>
            <div className="grid grid-cols-2 gap-1">
              {[
                { value: "todo", label: formatTaskStatus("todo") },
                { value: "in_progress", label: formatTaskStatus("in_progress") },
                { value: "done", label: formatTaskStatus("done") },
                { value: "all", label: "Hepsi" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSetStatus(item.value as "all" | TaskStatus)}
                  className={`rounded-sm px-2 py-1.5 text-xs transition-colors ${
                    statusValue === item.value ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Kategori</div>
            <div className="max-h-36 space-y-0.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => onSetCategory("all")}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors ${
                  !categoryFilter ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                }`}
                >
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  Hepsi
                </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSetCategory(category.name)}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors ${
                    categoryFilter?.value === category.name ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: colorHex(category.color) }} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterMenu;
