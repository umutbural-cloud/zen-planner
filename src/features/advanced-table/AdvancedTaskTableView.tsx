import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskStatus } from "@/hooks/useTasks";
import TaskEditDialog from "@/components/TaskEditDialog";
import { DelayedLoading, LoadingBlock } from "@/components/ui/delayed-loading";
import { useTasks, type Task } from "@/hooks/useTasks";
import { usePomodoroCategories } from "@/hooks/usePomodoroCategories";
import { ADVANCED_TASK_COLUMNS, DEFAULT_HIDDEN_COLUMN_IDS, REQUIRED_COLUMN_IDS } from "./columns";
import { applyTaskFilters } from "./filters";
import { groupTasks } from "./grouping";
import { createDefaultTableConfig, loadTableConfig, resetTableConfig, saveTableConfig } from "./storage";
import type { AdvancedTaskColumnId, CurrentTableConfig, TableFilter } from "./types";
import AdvancedTaskTable from "./components/AdvancedTaskTable";
import AdvancedTaskTableToolbar from "./components/AdvancedTaskTableToolbar";

type AdvancedTaskTableViewProps = {
  projectId: string;
};

const removeColumnFilter = (filters: TableFilter[], columnId: AdvancedTaskColumnId) =>
  filters.filter((filter) => filter.columnId !== columnId);

const setColumnFilter = (filters: TableFilter[], nextFilter: TableFilter | null) => {
  if (!nextFilter) return removeColumnFilter(filters, "title");
  return [...removeColumnFilter(filters, nextFilter.columnId), nextFilter];
};

const AdvancedTaskTableView = ({ projectId }: AdvancedTaskTableViewProps) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const { categories } = usePomodoroCategories();
  const [newTitle, setNewTitle] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [config, setConfig] = useState<CurrentTableConfig>(() => loadTableConfig(projectId));

  useEffect(() => {
    setConfig(loadTableConfig(projectId));
    setShowDone(false);
    setShowHidden(false);
    setEditTask(null);
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
      const current = map.get(task.parent_block_id) || [];
      map.set(task.parent_block_id, [...current, task]);
    });
    return map;
  }, [tasks]);

  const subtaskCountOf = useCallback((taskId: string) => subtasksByParentId.get(taskId)?.length || 0, [subtasksByParentId]);

  const visibleColumns = useMemo(() => {
    const validIds = new Set(ADVANCED_TASK_COLUMNS.map((column) => column.id));
    return config.columnOrder.filter((columnId) => validIds.has(columnId) && !config.hiddenColumnIds.includes(columnId));
  }, [config.columnOrder, config.hiddenColumnIds]);

  const filteredTasks = useMemo(
    () => applyTaskFilters(topLevelTasks, config.filters, categories, subtaskCountOf),
    [categories, config.filters, subtaskCountOf, topLevelTasks],
  );

  const hasFilters = config.filters.length > 0;
  const hasTasks = topLevelTasks.length > 0;
  const filteredOutByFilters = hasFilters && hasTasks && filteredTasks.length === 0;
  const activeGroupLabel = config.groupBy
    ? ADVANCED_TASK_COLUMNS.find((column) => column.id === config.groupBy)?.label || config.groupBy
    : null;

  const activeTasks = useMemo(
    () => filteredTasks.filter((task) => !task.hidden && task.status !== "done"),
    [filteredTasks],
  );

  const doneTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => !task.hidden && task.status === "done")
        .sort((a, b) => {
          const aTime = new Date(a.completed_at || a.created_at).getTime();
          const bTime = new Date(b.completed_at || b.created_at).getTime();
          return bTime - aTime;
        }),
    [filteredTasks],
  );

  const hiddenTasks = useMemo(
    () => filteredTasks.filter((task) => task.hidden),
    [filteredTasks],
  );

  const groups = useMemo(
    () => groupTasks(filteredTasks, config.groupBy, categories, subtaskCountOf),
    [categories, config.groupBy, filteredTasks, subtaskCountOf],
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

  const handleGroupByChange = (columnId: AdvancedTaskColumnId | null) => {
    updateConfig((current) => ({ ...current, groupBy: columnId }));
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

  const handleSetHiddenFilter = (value: "visible" | "hidden" | "all") => {
    updateConfig((current) => {
      const withoutHidden = removeColumnFilter(current.filters, "hidden");
      if (value === "all") return { ...current, filters: withoutHidden };
      return {
        ...current,
        filters: [...withoutHidden, { columnId: "hidden", operator: "equals", value: value === "hidden" ? "true" : "false" }],
      };
    });
  };

  const handleClearFilters = () => {
    updateConfig((current) => ({ ...current, filters: [] }));
  };

  const handleResetColumns = () => {
    updateConfig((current) => ({ ...current, hiddenColumnIds: [...DEFAULT_HIDDEN_COLUMN_IDS] }));
  };

  const handleResetView = () => {
    const next = createDefaultTableConfig();
    setShowDone(false);
    setShowHidden(false);
    setConfig(next);
    resetTableConfig(projectId);
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
        onSetHiddenFilter={handleSetHiddenFilter}
        onClearFilters={handleClearFilters}
        onResetView={handleResetView}
        groupLabel={activeGroupLabel}
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
            onClick={handleClearFilters}
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
              subtaskCountOf={subtaskCountOf}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onOpen={setEditTask}
            />
          )}

          {doneTasks.length > 0 && (() => {
            const visibleDone = showDone ? doneTasks : doneTasks.slice(0, 3);
            const hiddenDoneCount = Math.max(0, doneTasks.length - 3);
            return (
              <div className="space-y-0">
                <AdvancedTaskTable
                  groups={[{ key: "done", label: "Tamamlananlar", count: doneTasks.length, rows: visibleDone }]}
                  columns={visibleColumns}
                  categories={categories}
                  subtaskCountOf={subtaskCountOf}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onOpen={setEditTask}
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
          })()}

          {hiddenTasks.length > 0 && (
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
                  subtaskCountOf={subtaskCountOf}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onOpen={setEditTask}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <AdvancedTaskTable
          groups={groups}
          columns={visibleColumns}
          categories={categories}
          subtaskCountOf={subtaskCountOf}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onOpen={setEditTask}
        />
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
