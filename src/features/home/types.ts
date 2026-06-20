import type { LucideIcon } from "lucide-react";

export type HomeLoadState = "loading" | "ready" | "empty" | "error";

export type HomeSectionState<T> = {
  status: HomeLoadState;
  data: T;
  error?: string;
};

export type DailyFocusOption = {
  id: string;
  label: string;
  color?: string;
  allowsCustomText?: boolean;
};

export const DEFAULT_HOME_FOCUS_OPTIONS: DailyFocusOption[] = [
  { id: "rest", label: "Dinlenme", color: "green" },
  { id: "deep-work", label: "Derin Çalışma", color: "blue" },
  { id: "reading", label: "Okuma", color: "orange" },
];

export type HomeMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export type HomePlanTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress";
  completed_at: string | null;
  project_id: string | null;
  position: number;
};

export type HomeTasksData = {
  completedTodayCount: number;
  todo: HomePlanTask[];
  inProgress: HomePlanTask[];
};

export type HomePlanState = HomeSectionState<HomePlanTask[]> & {
  inProgress: HomePlanTask[];
  reorderTasks: (status: HomePlanTask["status"], activeId: string, overId: string) => void;
  advanceTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
};

export type HomeStudySession = {
  id: string;
  label: string;
  minutes: number;
  categoryLabel: string;
  endedAtLabel?: string;
};

export type HomeHabitTimeOfDay = "morning" | "noon" | "evening" | "night" | "any";

export type HomeHabit = {
  id: string;
  label: string;
  streak?: number;
  done?: boolean;
  icon: LucideIcon;
  timeOfDay?: HomeHabitTimeOfDay;
};

export type HomePomodoroSummary = Record<string, never>;

export type HomeRecentWorkItem = {
  id: string;
  name: string;
  durationLabel: string;
  endedAtLabel: string;
};

export type HomeDashboardData = {
  userName: string;
  greetingLabel: string;
  dateLabel: string;
  metrics: HomeSectionState<HomeMetric[]>;
  plan: HomePlanState;
  study: HomeSectionState<HomeStudySession[]>;
  habits: HomeSectionState<HomeHabit[]>;
  habitsDefaultFilter: Exclude<HomeHabitTimeOfDay, "any">;
  toggleHabit: (habitId: string) => Promise<void>;
  pomodoro: HomeSectionState<HomePomodoroSummary | null>;
  recentWork: HomeSectionState<HomeRecentWorkItem[]>;
};
