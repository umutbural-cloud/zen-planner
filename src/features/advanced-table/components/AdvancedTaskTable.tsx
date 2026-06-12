import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { getColumn } from "../columns";
import type { AdvancedTaskGroup } from "../grouping";
import type { AdvancedTaskColumnId } from "../types";
import AdvancedTaskRow from "./AdvancedTaskRow";
import SortableColumnHeader from "./SortableColumnHeader";

type AdvancedTaskTableProps = {
  groups: AdvancedTaskGroup[];
  columns: AdvancedTaskColumnId[];
  categories: PomodoroCategory[];
  subtaskCountOf: (taskId: string) => number;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  onReorderColumns?: (activeColumnId: AdvancedTaskColumnId, overColumnId: AdvancedTaskColumnId) => void;
};

const AdvancedTaskTable = ({
  groups,
  columns,
  categories,
  subtaskCountOf,
  onUpdate,
  onDelete,
  onOpen,
  onReorderColumns,
}: AdvancedTaskTableProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const columnDragEnabled = Boolean(onReorderColumns) && columns.length > 1;

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderColumns) return;
    onReorderColumns(active.id as AdvancedTaskColumnId, over.id as AdvancedTaskColumnId);
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-9 px-2"></TableHead>
                {columnDragEnabled ? (
                  <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                    {columns.map((columnId) => (
                      <SortableColumnHeader key={columnId} columnId={columnId} />
                    ))}
                  </SortableContext>
                ) : (
                  columns.map((columnId) => (
                    <TableHead key={columnId} className="h-9 whitespace-nowrap px-2 text-xs font-light tracking-wide">
                      {getColumn(columnId)?.label || columnId}
                    </TableHead>
                  ))
                )}
                <TableHead className="w-28 px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((task) => (
                <AdvancedTaskRow
                  key={task.id}
                  task={task}
                  columns={columns}
                  categories={categories}
                  subtaskCount={subtaskCountOf(task.id)}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );

  if (!columnDragEnabled) return content;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
      {content}
    </DndContext>
  );
};

export default AdvancedTaskTable;
