import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import type { TaskStatus } from "@/hooks/useTasks";
import type { AdvancedTaskColumnId, CurrentTableConfig, TableFilter } from "../types";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import FilterMenu from "./FilterMenu";
import GroupByMenu from "./GroupByMenu";

type AdvancedTaskTableToolbarProps = {
  newTitle: string;
  config: CurrentTableConfig;
  categories: PomodoroCategory[];
  groupLabel: string | null;
  onNewTitleChange: (value: string) => void;
  onCreate: () => void;
  onToggleColumn: (columnId: AdvancedTaskColumnId) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetTitleFilter: (value: string) => void;
  onSetStatusFilter: (value: "all" | TaskStatus) => void;
  onSetCategoryFilter: (value: string | "all") => void;
  onClearFilters: () => void;
  onResetView: () => void;
};

const AdvancedTaskTableToolbar = ({
  newTitle,
  config,
  categories,
  groupLabel,
  onNewTitleChange,
  onCreate,
  onToggleColumn,
  onGroupByChange,
  onSetTitleFilter,
  onSetStatusFilter,
  onSetCategoryFilter,
  onClearFilters,
  onResetView,
}: AdvancedTaskTableToolbarProps) => {
  const activeFilters: TableFilter[] = config.filters;
  const activeFilterCount = activeFilters.length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newTitle}
          onChange={(event) => onNewTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
          }}
          placeholder="Yeni görev..."
          className="h-9 min-w-[14rem] flex-1 bg-transparent text-sm"
        />
        <Button variant="ghost" size="sm" onClick={onCreate} className="h-9 shrink-0" title="Görev ekle" aria-label="Görev ekle">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <FilterMenu
          filters={config.filters}
          categories={categories}
          onSetTitle={onSetTitleFilter}
          onSetStatus={onSetStatusFilter}
          onSetCategory={onSetCategoryFilter}
          onClear={onClearFilters}
        />
        <GroupByMenu groupBy={config.groupBy} onChange={onGroupByChange} />
        <ColumnVisibilityMenu
          hiddenColumnIds={config.hiddenColumnIds}
          onToggle={onToggleColumn}
          onReset={onResetView}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 px-2 text-muted-foreground"
          onClick={onResetView}
          title="Görünüm ayarlarını sıfırla"
          aria-label="Görünüm ayarlarını sıfırla"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {(activeFilterCount > 0 || config.groupBy) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {config.groupBy && (
            <span className="rounded-sm bg-accent/50 px-1.5 py-0.5">
              Gruplama: {groupLabel || "Yok"}
            </span>
          )}
          {activeFilterCount > 0 && (
            <span className="rounded-sm bg-accent/50 px-1.5 py-0.5">
              Filtre: {activeFilterCount} aktif
            </span>
          )}
          {(activeFilterCount > 0 || config.groupBy) && (
            <button
              type="button"
              onClick={onResetView}
              className="rounded-sm px-1.5 py-0.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              title="Görünüm ayarlarını sıfırla"
            >
              Sıfırla
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedTaskTableToolbar;
