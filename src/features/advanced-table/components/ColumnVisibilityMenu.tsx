import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADVANCED_TASK_COLUMNS, REQUIRED_COLUMN_IDS } from "../columns";
import type { AdvancedTaskColumnId } from "../types";

type ColumnVisibilityMenuProps = {
  hiddenColumnIds: AdvancedTaskColumnId[];
  onToggle: (columnId: AdvancedTaskColumnId) => void;
};

const ColumnVisibilityMenu = ({ hiddenColumnIds, onToggle }: ColumnVisibilityMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" title="Sütunlar">
        <Columns3 className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Sütunlar
      </DropdownMenuLabel>
      {ADVANCED_TASK_COLUMNS.map((column) => {
        const required = REQUIRED_COLUMN_IDS.includes(column.id);
        return (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={!hiddenColumnIds.includes(column.id)}
            disabled={required}
            onCheckedChange={() => onToggle(column.id)}
            className="text-xs"
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default ColumnVisibilityMenu;
