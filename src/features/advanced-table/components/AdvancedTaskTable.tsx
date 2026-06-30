import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
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
import { GripVertical } from "lucide-react";
import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { ADVANCED_TASK_COLUMN_SIZING, clampColumnWidth, type AdvancedTaskColumnWidthMap } from "../columnSizing";
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
  columnWidths: AdvancedTaskColumnWidthMap;
  onColumnWidthChange: (columnId: AdvancedTaskColumnId, width: number) => void;
  onColumnWidthsCommit: (widths: AdvancedTaskColumnWidthMap) => void;
};

const LEADING_COLUMN_WIDTH = 48;
const TRAILING_COLUMN_WIDTH = 112;

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
  columnWidths,
  onColumnWidthChange,
  onColumnWidthsCommit,
}: AdvancedTaskTableProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const columnDragEnabled = Boolean(onReorderColumns) && columns.length > 1;
  const rowDragEnabled = Boolean(rowReorderEnabled && onReorderRows);
  const latestColumnWidthsRef = useRef(columnWidths);

  useEffect(() => {
    latestColumnWidthsRef.current = columnWidths;
  }, [columnWidths]);

  useEffect(() => () => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const tableWidth = useMemo(() => {
    const dynamicWidth = columns.reduce((total, columnId) => total + columnWidths[columnId], 0);
    return LEADING_COLUMN_WIDTH + dynamicWidth + TRAILING_COLUMN_WIDTH;
  }, [columnWidths, columns]);

  const tableStyle = {
    "--advanced-table-width": `${tableWidth}px`,
  } as CSSProperties;

  const createColumnStyle = (columnId: AdvancedTaskColumnId) => ({
    "--advanced-column-width": `${columnWidths[columnId]}px`,
  }) as CSSProperties;

  const handleColumnResizeStart = useCallback((columnId: AdvancedTaskColumnId, startX: number) => {
    const startWidth = columnWidths[columnId];
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = clampColumnWidth(columnId, startWidth + event.clientX - startX);
      const nextWidths = {
        ...latestColumnWidthsRef.current,
        [columnId]: nextWidth,
      };
      latestColumnWidthsRef.current = nextWidths;
      onColumnWidthChange(columnId, nextWidth);
    };

    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    const handleMouseUp = () => {
      cleanup();
      onColumnWidthsCommit(latestColumnWidthsRef.current);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [columnWidths, onColumnWidthChange, onColumnWidthsCommit]);

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
        <section key={group.key} className="overflow-hidden rounded-[1.1rem] border border-border/60 bg-card/45 md:rounded-sm md:bg-transparent">
          <div className="flex min-h-11 items-center gap-2 border-b border-border/50 bg-card/35 px-3.5 py-2 text-xs text-muted-foreground md:min-h-0 md:px-3">
            {group.color && <span className="h-2 w-2 rounded-full md:h-1.5 md:w-1.5" style={{ background: group.color }} />}
            <span className="tracking-wide text-foreground/80 md:text-muted-foreground">{group.label}</span>
            <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground md:bg-transparent md:px-0 md:py-0 md:text-xs">{group.count}</span>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px] md:min-w-[var(--advanced-table-width)]" style={tableStyle}>
              <colgroup>
                <col className="md:[width:48px]" />
                {columns.map((columnId) => (
                  <col
                    key={columnId}
                    className="md:[width:var(--advanced-column-width)]"
                    style={createColumnStyle(columnId)}
                  />
                ))}
                <col className="md:[width:112px]" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-border/50 bg-background/35 hover:bg-background/35 md:bg-transparent md:hover:bg-transparent">
                  <TableHead className="w-16 px-3 md:w-9 md:px-2">
                    <span
                      className="inline-flex h-6 w-4 items-center justify-center rounded-sm text-muted-foreground/25"
                      aria-hidden="true"
                      title="Satır sıralama"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                  </TableHead>
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
                          width={columnWidths[columnId]}
                          minWidth={ADVANCED_TASK_COLUMN_SIZING[columnId].minWidth}
                          maxWidth={ADVANCED_TASK_COLUMN_SIZING[columnId].maxWidth}
                          onResizeStart={handleColumnResizeStart}
                        />
                      ))}
                    </SortableContext>
                  ) : (
                    columns.map((columnId) => (
                      <TableHead key={columnId} className="group relative h-10 whitespace-nowrap px-2 text-xs font-light tracking-wide md:h-9">
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
                        <button
                          type="button"
                          className="absolute right-0 top-0 z-10 hidden h-full w-3 cursor-col-resize items-center justify-center md:flex"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleColumnResizeStart(columnId, event.clientX);
                          }}
                          aria-label={`${getColumn(columnId)?.label || columnId} kolon genişliğini değiştir`}
                          title="Kolon genişliğini değiştir"
                        >
                          <span className="h-5 w-px rounded-full bg-muted-foreground/40 opacity-70 transition-colors group-hover:bg-muted-foreground/70 group-hover:opacity-100" />
                        </button>
                      </TableHead>
                    ))
                  )}
                  <TableHead className="w-14 px-2 md:w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowDragEnabled ? (
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
