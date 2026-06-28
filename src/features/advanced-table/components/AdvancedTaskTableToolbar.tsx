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
  sortLabel: string | null;
  onNewTitleChange: (value: string) => void;
  onCreate: () => void;
  onToggleColumn: (columnId: AdvancedTaskColumnId) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetTitleFilter: (value: string) => void;
  onSetStatusFilter: (value: "all" | TaskStatus) => void;
  onSetCategoryFilter: (value: string | "all") => void;
  onClearTableControls: () => void;
  onResetColumns: () => void;
};

const AdvancedTaskTableToolbar = ({
  newTitle,
  config,
  categories,
  groupLabel,
  sortLabel,
  onNewTitleChange,
  onCreate,
  onToggleColumn,
  onGroupByChange,
  onSetTitleFilter,
  onSetStatusFilter,
  onSetCategoryFilter,
  onClearTableControls,
  onResetColumns,
}: AdvancedTaskTableToolbarProps) => {
  const activeFilters: TableFilter[] = config.filters;
  const activeFilterCount = activeFilters.length;
  return (
    <div className="space-y-3 md:space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newTitle}
          onChange={(event) => onNewTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
          }}
          placeholder="Yeni görev..."
          className="min-w-full flex-1 bg-background/70 text-base md:h-9 md:min-w-[14rem] md:bg-transparent md:text-sm"
        />
        <Button variant="ghost" size="sm" onClick={onCreate} className="shrink-0 px-4 md:h-9 md:px-3" title="Görev ekle" aria-label="Görev ekle">
          <Plus className="h-3.5 w-3.5" />
          <span className="md:hidden">Ekle</span>
        </Button>
        <FilterMenu
          filters={config.filters}
          categories={categories}
          onSetTitle={onSetTitleFilter}
          onSetStatus={onSetStatusFilter}
          onSetCategory={onSetCategoryFilter}
          onClear={onClearTableControls}
        />
        <GroupByMenu groupBy={config.groupBy} onChange={onGroupByChange} />
        <ColumnVisibilityMenu
          hiddenColumnIds={config.hiddenColumnIds}
          onToggle={onToggleColumn}
          onReset={onResetColumns}
        />
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-3 text-muted-foreground md:h-9 md:px-2"
          onClick={onClearTableControls}
          title="Görünüm ayarlarını sıfırla"
          aria-label="Görünüm ayarlarını sıfırla"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {(activeFilterCount > 0 || config.groupBy || config.sort) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {config.sort && (
            <span className="rounded-sm bg-accent/50 px-1.5 py-0.5">
              Sıralama: {sortLabel || "Yok"}
            </span>
          )}
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
          {(activeFilterCount > 0 || config.groupBy || config.sort) && (
            <button
              type="button"
              onClick={onClearTableControls}
              className="rounded-sm px-1.5 py-0.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              title="Filtre, sıralama ve gruplamayı temizle"
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
