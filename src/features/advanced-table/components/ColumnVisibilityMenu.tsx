import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADVANCED_TASK_COLUMNS, REQUIRED_COLUMN_IDS } from "../columns";
import type { AdvancedTaskColumnId } from "../types";

type ColumnVisibilityMenuProps = {
  hiddenColumnIds: AdvancedTaskColumnId[];
  onToggle: (columnId: AdvancedTaskColumnId) => void;
  onReset: () => void;
};

const ColumnVisibilityMenu = ({ hiddenColumnIds, onToggle, onReset }: ColumnVisibilityMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-2 text-muted-foreground"
        title="Sütunlar"
        aria-label="Sütun görünürlüğünü yönet"
      >
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
            className={`text-xs ${required ? "cursor-default opacity-70" : ""}`}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        );
      })}
      <DropdownMenuSeparator />
      <div className="px-2 pb-1 text-[10px] tracking-wide text-muted-foreground">
        Başlık kolonu zorunludur.
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Sütunları sıfırla"
      >
        Varsayılan sütunları göster
      </button>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default ColumnVisibilityMenu;
