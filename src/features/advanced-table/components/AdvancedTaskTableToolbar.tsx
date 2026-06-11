import { Plus } from "lucide-react";
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
  onNewTitleChange: (value: string) => void;
  onCreate: () => void;
  onToggleColumn: (columnId: AdvancedTaskColumnId) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetTitleFilter: (value: string) => void;
  onSetStatusFilter: (value: "all" | TaskStatus) => void;
  onSetCategoryFilter: (value: string | "all") => void;
  onSetHiddenFilter: (value: "visible" | "hidden" | "all") => void;
  onClearFilters: () => void;
};

const AdvancedTaskTableToolbar = ({
  newTitle,
  config,
  categories,
  onNewTitleChange,
  onCreate,
  onToggleColumn,
  onGroupByChange,
  onSetTitleFilter,
  onSetStatusFilter,
  onSetCategoryFilter,
  onSetHiddenFilter,
  onClearFilters,
}: AdvancedTaskTableToolbarProps) => {
  const activeFilters: TableFilter[] = config.filters;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(event) => onNewTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
          }}
          placeholder="Yeni görev..."
          className="h-9 bg-transparent text-sm"
        />
        <Button variant="ghost" size="sm" onClick={onCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <FilterMenu
          filters={config.filters}
          categories={categories}
          onSetTitle={onSetTitleFilter}
          onSetStatus={onSetStatusFilter}
          onSetCategory={onSetCategoryFilter}
          onSetHidden={onSetHiddenFilter}
          onClear={onClearFilters}
        />
        <GroupByMenu groupBy={config.groupBy} onChange={onGroupByChange} />
        <ColumnVisibilityMenu hiddenColumnIds={config.hiddenColumnIds} onToggle={onToggleColumn} />
      </div>
      {(activeFilters.length > 0 || config.groupBy) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {config.groupBy && <span className="rounded-sm bg-accent/50 px-1.5 py-0.5">Gruplu görünüm</span>}
          {activeFilters.length > 0 && <span className="rounded-sm bg-accent/50 px-1.5 py-0.5">{activeFilters.length} ek filtre</span>}
        </div>
      )}
    </div>
  );
};

export default AdvancedTaskTableToolbar;
