export type AdvancedTaskColumnId =
  | "title"
  | "status"
  | "category"
  | "start"
  | "end"
  | "completed_at"
  | "hidden"
  | "kind"
  | "color"
  | "subtasks";

export type AdvancedTaskColumnType =
  | "text"
  | "status"
  | "category"
  | "date"
  | "time"
  | "boolean"
  | "kind"
  | "color"
  | "count";

export type AdvancedTaskColumn = {
  id: AdvancedTaskColumnId;
  label: string;
  type: AdvancedTaskColumnType;
  defaultVisible: boolean;
};

export type TableFilterOperator = "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";

export type TableFilter = {
  columnId: AdvancedTaskColumnId;
  operator: TableFilterOperator;
  value?: string;
};

export type CurrentTableConfig = {
  version: 2;
  columnOrder: AdvancedTaskColumnId[];
  hiddenColumnIds: AdvancedTaskColumnId[];
  groupBy: AdvancedTaskColumnId | null;
  filters: TableFilter[];
};
