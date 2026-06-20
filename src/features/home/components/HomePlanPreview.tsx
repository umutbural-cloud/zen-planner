import { useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, Check, CheckCircle2, Circle, Clock, ListTodo, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { HomePlanState, HomePlanTask, HomeSectionState, HomeStudySession } from "@/features/home/types";

type Props = {
  plan: HomePlanState;
  study: HomeSectionState<HomeStudySession[]>;
};

const TABS = [
  { id: "tasks", label: "Görevler", icon: ListTodo },
  { id: "doing", label: "Yapılıyor", icon: Loader2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TaskRow = ({
  task,
  onAdvance,
  onComplete,
}: {
  task: HomePlanTask;
  onAdvance: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const isInProgress = task.status === "in_progress";
  const handleAction = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if (isInProgress) await onComplete(task.id);
      else await onAdvance(task.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Görev güncellenemedi.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-sm hover:bg-accent/20 transition-colors ${
        isDragging ? "bg-accent/30" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {task.status === "in_progress" ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 text-amber-500/80 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm tracking-wide text-foreground">
          {task.title}
        </div>
      </div>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          void handleAction();
        }}
        disabled={isUpdating}
        title={isInProgress ? "Görevi tamamla" : "Yapılıyor'a taşı"}
        aria-label={isInProgress ? "Görevi tamamla" : "Görevi Yapılıyor'a taşı"}
        className="shrink-0 rounded-sm border border-border/60 p-1 text-muted-foreground opacity-100 transition-colors hover:bg-accent/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {isUpdating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isInProgress ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
};

const HomePlanPreview = ({ plan, study }: Props) => {
  const [tab, setTab] = useState<TabId>("tasks");
  const [expanded, setExpanded] = useState<Record<TabId, boolean>>({ tasks: false, doing: false });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const totalMinutes = study.data.reduce((sum, row) => sum + row.minutes, 0);
  const activeStatus: HomePlanTask["status"] = tab === "tasks" ? "todo" : "in_progress";
  const activeTasks = tab === "tasks" ? plan.data : plan.inProgress;
  const visibleTasks = expanded[tab] ? activeTasks : activeTasks.slice(0, 5);
  const hasMoreTasks = activeTasks.length > visibleTasks.length;
  const isPlanReady = plan.status === "ready" || plan.status === "empty";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeTasks.findIndex((task) => task.id === active.id);
    const newIndex = activeTasks.findIndex((task) => task.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    plan.reorderTasks(activeStatus, String(active.id), String(over.id));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-sm border border-border/60 bg-transparent overflow-hidden">
        <header className="flex items-center gap-1 px-2 pt-2 border-b border-border/60">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs tracking-wide transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {active && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
              </button>
            );
          })}
          <div className="ml-auto pr-2 text-[10px] text-muted-foreground tracking-wide">
            {activeTasks.length} görev
          </div>
        </header>

        <div className="p-2">
          {plan.status === "loading" && <div className="h-52 rounded-sm border border-border/60 bg-transparent animate-pulse" />}
          {plan.status === "error" && <div className="px-4 py-10 text-center text-xs text-destructive">{plan.error || "Plan yüklenemedi."}</div>}
          {isPlanReady && activeTasks.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground tracking-wide">
              {tab === "tasks" ? "Yapılacak görev görünmüyor." : "Devam eden görev görünmüyor."}
            </div>
          )}
          {isPlanReady && activeTasks.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-border/50">
                  {visibleTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onAdvance={plan.advanceTask} onComplete={plan.completeTask} />
                  ))}
                  {hasMoreTasks && (
                    <li className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [tab]: true }))}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Devamını göster
                      </button>
                    </li>
                  )}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      <section className="rounded-sm border border-border/60 bg-transparent overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-light tracking-wide">Çalışma Süresi</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.floor(totalMinutes / 60)} sa {totalMinutes % 60} dk
          </span>
        </header>

        {study.status === "loading" ? (
          <div className="mx-5 mb-5 h-28 rounded-sm border border-border/60 bg-transparent animate-pulse" />
        ) : study.status === "error" ? (
          <div className="px-5 pb-5 text-xs text-destructive">{study.error || "Çalışma süresi yüklenemedi."}</div>
        ) : study.status === "empty" || study.data.length === 0 ? (
          <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün çalışma oturumu yok.</div>
        ) : (
          <>
            <div className="border-t border-border/60">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  <TrendingUp className="h-3 w-3" />
                  Bugünkü oturumlar
                </div>
                <ul className="divide-y divide-border/40">
                  {study.data.map((row) => (
                    <li key={row.id} className="flex items-center justify-between px-3 py-2 rounded-sm hover:bg-accent/20 transition-colors">
                      <span className="min-w-0 truncate">
                        <span className="block truncate text-sm tracking-wide text-foreground/90">{row.label}</span>
                        <span className="block truncate text-[10px] tracking-wide text-muted-foreground">
                          {row.categoryLabel}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {row.minutes} dk{row.endedAtLabel ? ` · ${row.endedAtLabel}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default HomePlanPreview;
