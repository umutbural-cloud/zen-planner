import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskStatus } from "@/hooks/useTasks";
import TaskEditDialog from "@/components/TaskEditDialog";
import { DelayedLoading, LoadingBlock } from "@/components/ui/delayed-loading";
import { useTasks, type Task } from "@/hooks/useTasks";
import { usePomodoroCategories, type PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { ADVANCED_TASK_COLUMNS, DEFAULT_HIDDEN_COLUMN_IDS, getColumnLabel, formatDateTimeParts, formatTaskImportance, formatTaskUrgency, REQUIRED_COLUMN_IDS } from "./columns";
import { applyTaskFilters } from "./filters";
import { groupTasks } from "./grouping";
import { applyTaskSort } from "./sorting";
import { loadTableConfig, saveTableConfig } from "./storage";
import type { AdvancedTaskColumnId, ColumnFilterOption, CurrentTableConfig, TableFilter, TableSort } from "./types";
import AdvancedTaskTable from "./components/AdvancedTaskTable";
import AdvancedTaskTableToolbar from "./components/AdvancedTaskTableToolbar";
import { useAdvancedTableColumnWidths } from "./useAdvancedTableColumnWidths";
import { arrayMove } from "@dnd-kit/sortable";
import { formatTaskStatus } from "./statusLabels";

type AdvancedTaskTableViewProps = {
  projectId: string;
};

const removeColumnFilter = (filters: TableFilter[], columnId: AdvancedTaskColumnId) =>
  filters.filter((filter) => filter.columnId !== columnId);

const setColumnFilter = (filters: TableFilter[], nextFilter: TableFilter | null) => {
  if (!nextFilter) return filters;
  return [...removeColumnFilter(filters, nextFilter.columnId), nextFilter];
};

const createEmptyOption = (): ColumnFilterOption => ({ label: "-", operator: "isEmpty" });

const getTaskFilterOption = (
  task: Task,
  columnId: AdvancedTaskColumnId,
  categories: PomodoroCategory[],
): ColumnFilterOption | null => {
  switch (columnId) {
    case "title":
      return null;
    case "status":
      return { label: formatTaskStatus(task.status), operator: "equals", value: task.status };
    case "category": {
      const categoryName = categories.find((category) => category.id === task.category_id)?.name || "";
      return categoryName ? { label: categoryName, operator: "equals", value: categoryName } : createEmptyOption();
    }
    case "start": {
      const value = formatDateTimeParts(task.start_date, task.start_time);
      return value === "—" ? createEmptyOption() : { label: value, operator: "equals", value };
    }
    case "end": {
      const value = formatDateTimeParts(task.end_date, task.end_time);
      return value === "—" ? createEmptyOption() : { label: value, operator: "equals", value };
    }
    case "urgency":
      return task.urgency ? { label: formatTaskUrgency(task.urgency), operator: "equals", value: task.urgency } : createEmptyOption();
    case "importance":
      return task.importance ? { label: formatTaskImportance(task.importance), operator: "equals", value: task.importance } : createEmptyOption();
    default:
      return null;
  }
};

const buildFilterOptions = (
  rows: Task[],
  columnId: AdvancedTaskColumnId,
  categories: PomodoroCategory[],
) => {
  const options = new Map<string, ColumnFilterOption>();
  rows.forEach((task) => {
    const option = getTaskFilterOption(task, columnId, categories);
    if (!option) return;
    options.set(`${option.operator}:${option.value || "__empty__"}`, option);
  });

  return [...options.values()].sort((a, b) => {
    if (a.operator === "isEmpty" && b.operator !== "isEmpty") return -1;
    if (b.operator === "isEmpty" && a.operator !== "isEmpty") return 1;
    return a.label.localeCompare(b.label, "tr");
  });
};

const AdvancedTaskTableView = ({ projectId }: AdvancedTaskTableViewProps) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const [newTitle, setNewTitle] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<CurrentTableConfig>(() => loadTableConfig(projectId));
  const { columnWidths, setColumnWidth, persistColumnWidths } = useAdvancedTableColumnWidths(projectId);

  useEffect(() => {
    setConfig(loadTableConfig(projectId));
    setShowDone(false);
    setShowHidden(false);
    setEditTask(null);
    setExpandedTaskIds(new Set());
  }, [projectId]);

  const updateConfig = useCallback((updater: (current: CurrentTableConfig) => CurrentTableConfig) => {
    setConfig((current) => {
      const next = updater(current);
      saveTableConfig(projectId, next);
      return next;
    });
  }, [projectId]);

  const topLevelTasks = useMemo(() => tasks.filter((task) => !task.parent_block_id), [tasks]);

  const subtasksByParentId = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.parent_block_id) return;
      const list = map.get(task.parent_block_id) ?? [];
      list.push(task);
      map.set(task.parent_block_id, list);
    });
    map.forEach((list) => list.sort((a, b) => a.position - b.position));
    return map;
  }, [tasks]);

  const visibleColumns = useMemo(() => {
    const validIds = new Set(ADVANCED_TASK_COLUMNS.map((column) => column.id));
    return config.columnOrder.filter((columnId) => validIds.has(columnId) && !config.hiddenColumnIds.includes(columnId));
  }, [config.columnOrder, config.hiddenColumnIds]);

  const filteredTasks = useMemo(
    () => applyTaskFilters(topLevelTasks, config.filters, categories),
    [categories, config.filters, topLevelTasks],
  );

  const sortedFilteredTasks = useMemo(
    () => applyTaskSort(filteredTasks, config.sort, categories),
    [categories, config.sort, filteredTasks],
  );

  const filterOptionsByColumn = useMemo(() => {
    return ADVANCED_TASK_COLUMNS.reduce((acc, column) => {
      const rows = applyTaskFilters(topLevelTasks, removeColumnFilter(config.filters, column.id), categories);
      acc[column.id] = buildFilterOptions(rows, column.id, categories);
      return acc;
    }, {} as Record<AdvancedTaskColumnId, ColumnFilterOption[]>);
  }, [categories, config.filters, topLevelTasks]);

  const hasFilters = config.filters.length > 0;
  const hasTasks = topLevelTasks.length > 0;
  const filteredOutByFilters = hasFilters && hasTasks && filteredTasks.length === 0;
  const activeGroupLabel = config.groupBy
    ? getColumnLabel(config.groupBy)
    : null;
  const activeSortLabel = config.sort ? getColumnLabel(config.sort.columnId) : null;
  const rowReorderEnabled = config.groupBy === null && config.sort === null && config.filters.length === 0;

  const activeTasks = useMemo(
    () => sortedFilteredTasks.filter((task) => !task.hidden && task.status !== "done"),
    [sortedFilteredTasks],
  );

  const activeGroups = useMemo(
    () => groupTasks(activeTasks, config.groupBy, categories),
    [activeTasks, categories, config.groupBy],
  );

  const doneTasks = useMemo(
    () => {
      const done = sortedFilteredTasks.filter((task) => !task.hidden && task.status === "done");
      if (config.sort) return done;
      return done;
    },
    [config.sort, sortedFilteredTasks],
  );

  const hiddenTasks = useMemo(
    () => sortedFilteredTasks.filter((task) => task.hidden),
    [sortedFilteredTasks],
  );

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    await createTask({ title });
    setNewTitle("");
  };

  const handleToggleColumn = (columnId: AdvancedTaskColumnId) => {
    if (REQUIRED_COLUMN_IDS.includes(columnId)) return;
    updateConfig((current) => {
      const hiddenColumnIds = current.hiddenColumnIds.includes(columnId)
        ? current.hiddenColumnIds.filter((item) => item !== columnId)
        : [...current.hiddenColumnIds, columnId];
      return { ...current, hiddenColumnIds };
    });
  };

  const handleReorderColumns = (activeColumnId: AdvancedTaskColumnId, overColumnId: AdvancedTaskColumnId) => {
    if (activeColumnId === overColumnId) return;
    updateConfig((current) => {
      const oldIndex = current.columnOrder.indexOf(activeColumnId);
      const newIndex = current.columnOrder.indexOf(overColumnId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return current;
      return { ...current, columnOrder: arrayMove(current.columnOrder, oldIndex, newIndex) };
    });
  };

  const handleReorderRows = (activeTaskId: string, overTaskId: string) => {
    if (activeTaskId === overTaskId) return;
    const reorderWithinSection = (sectionRows: Task[]) => {
      const oldIndex = sectionRows.findIndex((task) => task.id === activeTaskId);
      const newIndex = sectionRows.findIndex((task) => task.id === overTaskId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;
      return arrayMove(sectionRows, oldIndex, newIndex);
    };

    const reorderedRows = reorderWithinSection(activeTasks) ?? reorderWithinSection(doneTasks);
    if (!reorderedRows) return;

    const reorderedIds = new Set(reorderedRows.map((task) => task.id));
    let nextIndex = 0;
    const finalOrder = tasks.map((task) => (
      reorderedIds.has(task.id) ? reorderedRows[nextIndex++] : task
    ));

    void reorderTasks(finalOrder.map((task) => task.id));
  };

  const handleGroupByChange = (columnId: AdvancedTaskColumnId | null) => {
    updateConfig((current) => ({ ...current, groupBy: columnId }));
  };

  const handleSortChange = (sort: TableSort | null) => {
    updateConfig((current) => ({ ...current, sort }));
  };

  const handleSetTitleFilter = (value: string) => {
    updateConfig((current) => ({
      ...current,
      filters: value.trim()
        ? setColumnFilter(current.filters, { columnId: "title", operator: "contains", value: value.trim() })
        : removeColumnFilter(current.filters, "title"),
    }));
  };

  const handleSetStatusFilter = (value: "all" | TaskStatus) => {
    updateConfig((current) => {
      const withoutStatus = removeColumnFilter(current.filters, "status");
      if (value === "all") return { ...current, filters: withoutStatus };
      return { ...current, filters: [...withoutStatus, { columnId: "status", operator: "equals", value }] };
    });
  };

  const handleSetCategoryFilter = (value: string | "all") => {
    updateConfig((current) => ({
      ...current,
      filters: value === "all"
        ? removeColumnFilter(current.filters, "category")
        : [...removeColumnFilter(current.filters, "category"), { columnId: "category", operator: "equals", value }],
    }));
  };

  const handleSetColumnFilter = (filter: TableFilter) => {
    updateConfig((current) => ({ ...current, filters: setColumnFilter(current.filters, filter) }));
  };

  const handleClearColumnFilter = (columnId: AdvancedTaskColumnId) => {
    updateConfig((current) => ({ ...current, filters: removeColumnFilter(current.filters, columnId) }));
  };

  const handleClearTableControls = () => {
    updateConfig((current) => ({
      ...current,
      sort: null,
      groupBy: null,
      filters: [],
    }));
  };

  const handleResetColumns = () => {
    updateConfig((current) => ({ ...current, hiddenColumnIds: [...DEFAULT_HIDDEN_COLUMN_IDS] }));
  };

  const handleToggleExpandedTask = (taskId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const renderDoneSection = () => {
    if (doneTasks.length === 0) return null;

    const visibleDone = showDone ? doneTasks : doneTasks.slice(0, 3);
    const hiddenDoneCount = Math.max(0, doneTasks.length - 3);

    return (
      <div className="space-y-0">
        <AdvancedTaskTable
          groups={[{ key: "done", label: "Tamamlananlar", count: doneTasks.length, rows: visibleDone }]}
          columns={visibleColumns}
          categories={categories}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onOpen={setEditTask}
          subtasksByParentId={subtasksByParentId}
          expandedTaskIds={expandedTaskIds}
          onToggleExpanded={handleToggleExpandedTask}
          onReorderColumns={handleReorderColumns}
          rowReorderEnabled={rowReorderEnabled}
          onReorderRows={handleReorderRows}
          sort={config.sort}
          groupBy={config.groupBy}
          filters={config.filters}
          filterOptionsByColumn={filterOptionsByColumn}
          onSortChange={handleSortChange}
          onGroupByChange={handleGroupByChange}
          onSetColumnFilter={handleSetColumnFilter}
          onClearColumnFilter={handleClearColumnFilter}
          columnWidths={columnWidths}
          onColumnWidthChange={setColumnWidth}
          onColumnWidthsCommit={persistColumnWidths}
        />
        {hiddenDoneCount > 0 && (
          <button
            type="button"
            onClick={() => setShowDone((current) => !current)}
            className="w-full rounded-b-sm border-x border-b border-border/60 py-2 text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {showDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenDoneCount} tane daha göster`}
          </button>
        )}
      </div>
    );
  };

  const renderHiddenSection = () => {
    if (hiddenTasks.length === 0) return null;

    return (
      <div className="overflow-hidden rounded-sm border border-border/60">
        <button
          type="button"
          onClick={() => setShowHidden((current) => !current)}
          className="flex w-full items-center gap-2 bg-card/30 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-card/40"
        >
          <span>{showHidden ? "↓" : "→"}</span>
          <span className="tracking-wide">Gizlenenler</span>
          <span className="text-muted-foreground/60">{hiddenTasks.length}</span>
        </button>
        {showHidden && (
          <AdvancedTaskTable
            groups={[{ key: "hidden", label: "Gizlenenler", count: hiddenTasks.length, rows: hiddenTasks }]}
            columns={visibleColumns}
            categories={categories}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onOpen={setEditTask}
            subtasksByParentId={subtasksByParentId}
            expandedTaskIds={expandedTaskIds}
            onToggleExpanded={handleToggleExpandedTask}
            onReorderColumns={handleReorderColumns}
            sort={config.sort}
            groupBy={config.groupBy}
            filters={config.filters}
            filterOptionsByColumn={filterOptionsByColumn}
            onSortChange={handleSortChange}
            onGroupByChange={handleGroupByChange}
            onSetColumnFilter={handleSetColumnFilter}
            onClearColumnFilter={handleClearColumnFilter}
            columnWidths={columnWidths}
            onColumnWidthChange={setColumnWidth}
            onColumnWidthsCommit={persistColumnWidths}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <DelayedLoading
        loading
        delay={300}
        fallback={(
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
              <span>Yükleniyor</span>
            </div>
            <LoadingBlock lines={2} className="max-w-xl" />
          </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AdvancedTaskTableToolbar
        newTitle={newTitle}
        config={config}
        categories={categories}
        onNewTitleChange={setNewTitle}
        onCreate={handleCreate}
        onToggleColumn={handleToggleColumn}
        onGroupByChange={handleGroupByChange}
        onSetTitleFilter={handleSetTitleFilter}
        onSetStatusFilter={handleSetStatusFilter}
        onSetCategoryFilter={handleSetCategoryFilter}
        onClearTableControls={handleClearTableControls}
        onResetColumns={handleResetColumns}
        groupLabel={activeGroupLabel}
        sortLabel={activeSortLabel}
      />

      {visibleColumns.length === 0 ? (
        <div className="rounded-sm border border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
          <p className="mb-2">Görünür sütun yok</p>
          <button type="button" onClick={handleResetColumns} className="text-xs text-foreground hover:underline">
            Varsayılan sütunları göster
          </button>
        </div>
      ) : filteredOutByFilters ? (
        <div className="rounded-sm border border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
          <p className="mb-1">Filtreye uygun görev yok</p>
          <p className="text-xs">Filtreleri temizle</p>
          <button
            type="button"
            onClick={handleClearTableControls}
            className="mt-3 rounded-sm border border-border/60 px-3 py-1.5 text-xs text-foreground hover:bg-accent/50"
          >
            Filtreleri temizle
          </button>
        </div>
      ) : !hasTasks ? (
        <div className="rounded-sm border border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
          <p className="mb-1">Henüz görev yok</p>
          <p className="text-xs">Yukarıdan yeni görev ekleyebilirsin</p>
        </div>
      ) : config.groupBy === null ? (
        <div className="space-y-3">
          {(activeTasks.length > 0 || (doneTasks.length === 0 && hiddenTasks.length === 0)) && (
            <AdvancedTaskTable
              groups={[{ key: "active", label: "Görevler", count: activeTasks.length, rows: activeTasks }]}
              columns={visibleColumns}
              categories={categories}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onOpen={setEditTask}
              subtasksByParentId={subtasksByParentId}
              expandedTaskIds={expandedTaskIds}
              onToggleExpanded={handleToggleExpandedTask}
              onReorderColumns={handleReorderColumns}
              rowReorderEnabled={rowReorderEnabled}
              onReorderRows={handleReorderRows}
              sort={config.sort}
              groupBy={config.groupBy}
              filters={config.filters}
              filterOptionsByColumn={filterOptionsByColumn}
              onSortChange={handleSortChange}
              onGroupByChange={handleGroupByChange}
              onSetColumnFilter={handleSetColumnFilter}
              onClearColumnFilter={handleClearColumnFilter}
              columnWidths={columnWidths}
              onColumnWidthChange={setColumnWidth}
              onColumnWidthsCommit={persistColumnWidths}
            />
          )}

          {renderDoneSection()}
          {renderHiddenSection()}
        </div>
      ) : (
        <div className="space-y-3">
          {(activeGroups.length > 0 || (doneTasks.length === 0 && hiddenTasks.length === 0)) && (
            <AdvancedTaskTable
              groups={activeGroups}
              columns={visibleColumns}
              categories={categories}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onOpen={setEditTask}
              subtasksByParentId={subtasksByParentId}
              expandedTaskIds={expandedTaskIds}
              onToggleExpanded={handleToggleExpandedTask}
              onReorderColumns={handleReorderColumns}
              sort={config.sort}
              groupBy={config.groupBy}
              filters={config.filters}
              filterOptionsByColumn={filterOptionsByColumn}
              onSortChange={handleSortChange}
              onGroupByChange={handleGroupByChange}
              onSetColumnFilter={handleSetColumnFilter}
              onClearColumnFilter={handleClearColumnFilter}
              columnWidths={columnWidths}
              onColumnWidthChange={setColumnWidth}
              onColumnWidthsCommit={persistColumnWidths}
            />
          )}
          {renderDoneSection()}
          {renderHiddenSection()}
        </div>
      )}

      <TaskEditDialog
        task={editTask}
        projectId={projectId}
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        tasksOverride={tasks}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onCreateTask={createTask}
      />
    </div>
  );
};

export default AdvancedTaskTableView;
