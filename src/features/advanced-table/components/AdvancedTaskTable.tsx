import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { getColumn } from "../columns";
import type { AdvancedTaskGroup } from "../grouping";
import type { AdvancedTaskColumnId, ColumnFilterOption, TableFilter, TableSort } from "../types";
import AdvancedTaskRow from "./AdvancedTaskRow";
import ColumnHeaderMenu from "./ColumnHeaderMenu";
import SortableColumnHeader from "./SortableColumnHeader";

type AdvancedTaskTableProps = {
  groups: AdvancedTaskGroup[];
  columns: AdvancedTaskColumnId[];
  categories: PomodoroCategory[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  subtasksByParentId: Map<string, Task[]>;
  expandedTaskIds: Set<string>;
  onToggleExpanded: (taskId: string) => void;
  onReorderColumns?: (activeColumnId: AdvancedTaskColumnId, overColumnId: AdvancedTaskColumnId) => void;
  rowReorderEnabled?: boolean;
  onReorderRows?: (activeTaskId: string, overTaskId: string) => void;
  sort: TableSort | null;
  groupBy: AdvancedTaskColumnId | null;
  filters: TableFilter[];
  filterOptionsByColumn: Record<AdvancedTaskColumnId, ColumnFilterOption[]>;
  onSortChange: (sort: TableSort | null) => void;
  onGroupByChange: (columnId: AdvancedTaskColumnId | null) => void;
  onSetColumnFilter: (filter: TableFilter) => void;
  onClearColumnFilter: (columnId: AdvancedTaskColumnId) => void;
};

const AdvancedTaskTable = ({
  groups,
  columns,
  categories,
  onUpdate,
  onDelete,
  onOpen,
  subtasksByParentId,
  expandedTaskIds,
  onToggleExpanded,
  onReorderColumns,
  rowReorderEnabled,
  onReorderRows,
  sort,
  groupBy,
  filters,
  filterOptionsByColumn,
  onSortChange,
  onGroupByChange,
  onSetColumnFilter,
  onClearColumnFilter,
}: AdvancedTaskTableProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const columnDragEnabled = Boolean(onReorderColumns) && columns.length > 1;
  const rowDragEnabled = Boolean(rowReorderEnabled && onReorderRows);
  const getColumnSortableId = (groupKey: string, columnId: AdvancedTaskColumnId) => `column:${groupKey}:${columnId}`;
  const getRowSortableId = (groupKey: string, taskId: string) => `row:${groupKey}:${taskId}`;
  const getColumnIdFromSortableId = (id: unknown): AdvancedTaskColumnId | null => {
    const value = String(id);
    if (!value.startsWith("column:")) return null;
    const columnId = value.split(":").pop();
    return columns.includes(columnId as AdvancedTaskColumnId) ? (columnId as AdvancedTaskColumnId) : null;
  };
  const getTaskIdFromRowSortableId = (id: unknown): string | null => {
    const value = String(id);
    if (!value.startsWith("row:")) return null;
    const parts = value.split(":");
    return parts.length >= 3 ? parts.slice(2).join(":") : null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (String(active.id).startsWith("column:")) {
      if (!onReorderColumns) return;
      const activeColumnId = getColumnIdFromSortableId(active.id);
      const overColumnId = getColumnIdFromSortableId(over.id);

      if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return;

      onReorderColumns(activeColumnId, overColumnId);
      return;
    }

    if (String(active.id).startsWith("row:")) {
      if (!rowDragEnabled || !onReorderRows) return;
      const activeTaskId = getTaskIdFromRowSortableId(active.id);
      const overTaskId = getTaskIdFromRowSortableId(over.id);
      if (!activeTaskId || !overTaskId || activeTaskId === overTaskId) return;

      onReorderRows(activeTaskId, overTaskId);
    }
  };

  if (groups.every((group) => group.rows.length === 0)) {
    return (
      <div className="rounded-sm border border-border/60 py-12 text-center text-sm text-muted-foreground">
        <p className="mb-1">Boş</p>
        <p className="text-xs">Filtreye uygun görev yok</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-3">
      {groups.map((group) => (
        <section key={group.key} className="overflow-hidden rounded-sm border border-border/60">
          <div className="flex items-center gap-2 border-b border-border/50 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
            {group.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: group.color }} />}
            <span className="tracking-wide">{group.label}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/60">{group.count}</span>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-9 px-2"></TableHead>
                  {columnDragEnabled ? (
                    <SortableContext items={columns.map((columnId) => getColumnSortableId(group.key, columnId))} strategy={horizontalListSortingStrategy}>
                      {columns.map((columnId) => (
                        <SortableColumnHeader
                          key={columnId}
                          columnId={columnId}
                          sortableId={getColumnSortableId(group.key, columnId)}
                          sort={sort}
                          groupBy={groupBy}
                          filters={filters}
                          filterOptions={filterOptionsByColumn[columnId]}
                          onSortChange={onSortChange}
                          onGroupByChange={onGroupByChange}
                          onSetColumnFilter={onSetColumnFilter}
                          onClearColumnFilter={onClearColumnFilter}
                        />
                      ))}
                    </SortableContext>
                  ) : (
                    columns.map((columnId) => (
                      <TableHead key={columnId} className="h-9 whitespace-nowrap px-2 text-xs font-light tracking-wide">
                        <ColumnHeaderMenu
                          columnId={columnId}
                          sort={sort}
                          groupBy={groupBy}
                          filters={filters}
                          filterOptions={filterOptionsByColumn[columnId]}
                          onSortChange={onSortChange}
                          onGroupByChange={onGroupByChange}
                          onSetColumnFilter={onSetColumnFilter}
                          onClearColumnFilter={onClearColumnFilter}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center rounded-sm px-1 py-0.5 text-muted-foreground transition-colors hover:bg-card/40 hover:text-foreground"
                            title={`${getColumn(columnId)?.label || columnId} menüsünü aç`}
                            aria-label={`${getColumn(columnId)?.label || columnId} menüsünü aç`}
                          >
                            {getColumn(columnId)?.label || columnId}
                          </button>
                        </ColumnHeaderMenu>
                      </TableHead>
                    ))
                  )}
                  <TableHead className="w-28 px-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowDragEnabled && group.key === "active" ? (
                  <SortableContext items={group.rows.map((task) => getRowSortableId(group.key, task.id))} strategy={verticalListSortingStrategy}>
                    {group.rows.map((task) => (
                      <AdvancedTaskRow
                        key={task.id}
                        task={task}
                        columns={columns}
                        categories={categories}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onOpen={onOpen}
                        subtasks={subtasksByParentId.get(task.id) ?? []}
                        expanded={expandedTaskIds.has(task.id)}
                        onToggleExpanded={onToggleExpanded}
                        rowDragEnabled
                        sortableId={getRowSortableId(group.key, task.id)}
                      />
                    ))}
                  </SortableContext>
                ) : group.rows.map((task) => (
                  <AdvancedTaskRow
                    key={task.id}
                    task={task}
                    columns={columns}
                    categories={categories}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onOpen={onOpen}
                    subtasks={subtasksByParentId.get(task.id) ?? []}
                    expanded={expandedTaskIds.has(task.id)}
                    onToggleExpanded={onToggleExpanded}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );

  if (!columnDragEnabled && !rowDragEnabled) return content;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {content}
    </DndContext>
  );
};

export default AdvancedTaskTable;
