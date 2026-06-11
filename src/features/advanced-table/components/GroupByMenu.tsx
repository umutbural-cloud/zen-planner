import { Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADVANCED_TASK_COLUMNS } from "../columns";
import type { AdvancedTaskColumnId } from "../types";

const GROUPABLE_COLUMN_IDS: AdvancedTaskColumnId[] = ["status", "category", "hidden", "kind", "color"];

type GroupByMenuProps = {
  groupBy: AdvancedTaskColumnId | null;
  onChange: (columnId: AdvancedTaskColumnId | null) => void;
};

const GroupByMenu = ({ groupBy, onChange }: GroupByMenuProps) => {
  const activeColumn = ADVANCED_TASK_COLUMNS.find((column) => column.id === groupBy);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-2 ${groupBy ? "text-foreground" : "text-muted-foreground"}`}
          title="Grupla"
        >
          <Rows3 className="h-3.5 w-3.5" />
          {activeColumn && <span className="ml-1 hidden sm:inline text-xs">{activeColumn.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Grupla
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onChange(null)} className="text-xs">
          Gruplama yok
        </DropdownMenuItem>
        {ADVANCED_TASK_COLUMNS
          .filter((column) => GROUPABLE_COLUMN_IDS.includes(column.id))
          .map((column) => (
            <DropdownMenuItem key={column.id} onClick={() => onChange(column.id)} className="text-xs">
              {column.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GroupByMenu;
