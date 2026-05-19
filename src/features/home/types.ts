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
  allowsCustomText?: boolean;
};

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
  tag?: string;
  done?: boolean;
};

export type HomeStudySession = {
  id: string;
  label: string;
  minutes: number;
};

export type HomeHabit = {
  id: string;
  label: string;
  streak?: number;
  done?: boolean;
  icon: LucideIcon;
};

export type HomePomodoroSummary = {
  activeTaskTitle: string;
  completed: number;
  goal: number;
  remainingLabel: string;
  timerLabel: string;
  progress: number;
};

export type HomeNotePreview = {
  id: string;
  title: string;
  source: string;
  updatedLabel: string;
};

export type HomeDashboardData = {
  userName: string;
  dateLabel: string;
  campDayLabel: string;
  statusLabel: string;
  streakDays: number;
  metrics: HomeSectionState<HomeMetric[]>;
  plan: HomeSectionState<HomePlanTask[]>;
  study: HomeSectionState<HomeStudySession[]>;
  habits: HomeSectionState<HomeHabit[]>;
  pomodoro: HomeSectionState<HomePomodoroSummary | null>;
  notes: HomeSectionState<HomeNotePreview[]>;
  dayClose: HomeSectionState<{
    summary: string;
    actions: string[];
  }>;
};
