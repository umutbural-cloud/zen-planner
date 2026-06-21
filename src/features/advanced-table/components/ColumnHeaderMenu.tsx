import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getColumn, getColumnLabel, isGroupableColumnId } from "../columns";
import type { AdvancedTaskColumnId, ColumnFilterOption, TableFilter, TableSort } from "../types";

type ColumnHeaderMenuProps = {
  columnId: AdvancedTaskColumnId;
  sort: TableSort | null;
  groupBy: AdvancedTaskColumnId | null;
  filters: TableFilter[];
  filterOptions: ColumnFilterOption[];
  children: ReactNode;
  onSortChange: (sort: TableSort | null) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetColumnFilter: (filter: TableFilter) => void;
  onClearColumnFilter: (columnId: AdvancedTaskColumnId) => void;
};

const sectionLabelClassName = "px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
const itemClassName =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground";
const activeItemClassName = "bg-accent text-foreground hover:bg-accent";

const getFilter = (filters: TableFilter[], columnId: AdvancedTaskColumnId) =>
  filters.find((filter) => filter.columnId === columnId);

const isFilterOptionActive = (filter: TableFilter | undefined, option: ColumnFilterOption) => {
  if (!filter) return false;
  if (option.operator === "isEmpty") return filter.operator === "isEmpty";
  return filter.operator === "equals" && filter.value === option.value;
};

const CheckSlot = ({ active }: { active: boolean }) => (
  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
    {active && <Check className="h-3 w-3" />}
  </span>
);

const ColumnHeaderMenu = ({
  columnId,
  sort,
  groupBy,
  filters,
  filterOptions,
  children,
  onSortChange,
  onGroupByChange,
  onSetColumnFilter,
  onClearColumnFilter,
}: ColumnHeaderMenuProps) => {
  const [open, setOpen] = useState(false);
  const column = getColumn(columnId);
  const activeFilter = getFilter(filters, columnId);
  const titleFilter = columnId === "title" && activeFilter?.operator === "contains" ? activeFilter.value || "" : "";
  const sortAscLabel = column?.type === "date" ? "En yakından en uzağa" : "A'dan Z'ye";
  const sortDescLabel = column?.type === "date" ? "En uzaktan en yakına" : "Z'den A'ya";
  const activeAsc = sort?.columnId === columnId && sort.direction === "asc";
  const activeDesc = sort?.columnId === columnId && sort.direction === "desc";
  const groupable = isGroupableColumnId(columnId);
  const closeMenu = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-sm border-border/60 bg-popover/95 p-2 text-xs shadow-sm">
        <div className="px-1 pb-2 text-xs font-light tracking-wide text-foreground">{getColumnLabel(columnId)}</div>

        <div className="space-y-1">
          <div className={sectionLabelClassName}>Sırala</div>
          <button
            type="button"
            onClick={() => {
              onSortChange({ columnId, direction: "asc" });
              closeMenu();
            }}
            className={`${itemClassName} ${activeAsc ? activeItemClassName : ""}`}
          >
            <CheckSlot active={activeAsc} />
            <span>{sortAscLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSortChange({ columnId, direction: "desc" });
              closeMenu();
            }}
            className={`${itemClassName} ${activeDesc ? activeItemClassName : ""}`}
          >
            <CheckSlot active={activeDesc} />
            <span>{sortDescLabel}</span>
          </button>
          {sort?.columnId === columnId && (
            <button
              type="button"
              onClick={() => {
                onSortChange(null);
                closeMenu();
              }}
              className={itemClassName}
            >
              <CheckSlot active={false} />
              <span>Sıralamayı temizle</span>
            </button>
          )}
        </div>

        {groupable && (
          <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
            <div className={sectionLabelClassName}>Grupla</div>
            <button
              type="button"
              onClick={() => {
                onGroupByChange(columnId);
                closeMenu();
              }}
              className={`${itemClassName} ${groupBy === columnId ? activeItemClassName : ""}`}
            >
              <CheckSlot active={groupBy === columnId} />
              <span>Bu sütuna göre grupla</span>
            </button>
            {groupBy && (
              <button
                type="button"
                onClick={() => {
                  onGroupByChange(null);
                  closeMenu();
                }}
                className={itemClassName}
              >
                <CheckSlot active={false} />
                <span>Gruplamayı kaldır</span>
              </button>
            )}
          </div>
        )}

        <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
          <div className={sectionLabelClassName}>Filtrele</div>
          {columnId === "title" ? (
            <Input
              value={titleFilter}
              onChange={(event) => {
                const value = event.target.value.trim();
                if (!value) {
                  onClearColumnFilter(columnId);
                  return;
                }
                onSetColumnFilter({ columnId, operator: "contains", value });
              }}
              placeholder="İçerir..."
              className="h-8 bg-transparent text-xs"
            />
          ) : (
            <>
              {activeFilter && (
                <button
                  type="button"
                  onClick={() => {
                    onClearColumnFilter(columnId);
                    closeMenu();
                  }}
                  className={itemClassName}
                >
                  <CheckSlot active={false} />
                  <span>Filtreyi temizle</span>
                </button>
              )}
              <div className="max-h-44 space-y-0.5 overflow-y-auto">
                {filterOptions.length > 0 ? (
                  filterOptions.map((option) => {
                    const active = isFilterOptionActive(activeFilter, option);
                    return (
                      <button
                        key={`${option.operator}:${option.value || "__empty__"}`}
                        type="button"
                        onClick={() => {
                          onSetColumnFilter({ columnId, operator: option.operator, value: option.value });
                          closeMenu();
                        }}
                        className={`${itemClassName} ${active ? activeItemClassName : ""}`}
                      >
                        <CheckSlot active={active} />
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Uygun değer yok</div>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnHeaderMenu;
