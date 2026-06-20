export type AdvancedTaskColumnId =
  | "title"
  | "status"
  | "category"
  | "start"
  | "end"
  | "urgency"
  | "importance";

export type AdvancedTaskColumnType =
  | "text"
  | "status"
  | "category"
  | "date"
  | "choice";

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
