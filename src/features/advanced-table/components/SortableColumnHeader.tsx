import { GripVertical } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { getColumn } from "../columns";
import type { AdvancedTaskColumnId } from "../types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableColumnHeaderProps = {
  columnId: AdvancedTaskColumnId;
  sortableId: string;
};

const SortableColumnHeader = ({ columnId, sortableId }: SortableColumnHeaderProps) => {
  const column = getColumn(columnId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
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
        className="inline-flex cursor-grab touch-none items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        title="Sütunu sürükle"
        aria-label={`Sütunu taşı: ${column?.label || columnId}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
        <span>{column?.label || columnId}</span>
      </button>
    </TableHead>
  );
};

export default SortableColumnHeader;
