import { ChevronDown, GripVertical } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { getColumn } from "../columns";
import type { AdvancedTaskColumnId, ColumnFilterOption, TableFilter, TableSort } from "../types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ColumnHeaderMenu from "./ColumnHeaderMenu";

type SortableColumnHeaderProps = {
  columnId: AdvancedTaskColumnId;
  sortableId: string;
  sort: TableSort | null;
  groupBy: AdvancedTaskColumnId | null;
  filters: TableFilter[];
  filterOptions: ColumnFilterOption[];
  onSortChange: (sort: TableSort | null) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetColumnFilter: (filter: TableFilter) => void;
  onClearColumnFilter: (columnId: AdvancedTaskColumnId) => void;
};

const SortableColumnHeader = ({
  columnId,
  sortableId,
  sort,
  groupBy,
  filters,
  filterOptions,
  onSortChange,
  onGroupByChange,
  onSetColumnFilter,
  onClearColumnFilter,
}: SortableColumnHeaderProps) => {
  const column = getColumn(columnId);
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
  const adjustedTransform = transform ? { ...transform, y: 0 } : null;
  const style = {
    transform: adjustedTransform ? CSS.Transform.toString(adjustedTransform) : undefined,
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="h-9 whitespace-nowrap px-2 text-xs font-light tracking-wide"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="inline-flex cursor-grab touch-none items-center rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-card/40 hover:text-foreground active:cursor-grabbing"
        title="Sütunu sürükle"
        aria-label={`Sütunu taşı: ${column?.label || columnId}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
      </button>
      <ColumnHeaderMenu
        columnId={columnId}
        sort={sort}
        groupBy={groupBy}
        filters={filters}
        filterOptions={filterOptions}
        onSortChange={onSortChange}
        onGroupByChange={onGroupByChange}
        onSetColumnFilter={onSetColumnFilter}
        onClearColumnFilter={onClearColumnFilter}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-muted-foreground transition-colors hover:bg-card/40 hover:text-foreground"
          title={`${column?.label || columnId} menüsünü aç`}
          aria-label={`${column?.label || columnId} menüsünü aç`}
        >
          <span>{column?.label || columnId}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </ColumnHeaderMenu>
    </TableHead>
  );
};

export default SortableColumnHeader;
