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

export type HomeHabitTimeOfDay = "morning" | "noon" | "evening" | "night";

export type HomeHabit = {
  id: string;
  label: string;
  streak?: number;
  done?: boolean;
  icon: LucideIcon;
  timeOfDay?: HomeHabitTimeOfDay;
};

export type HomePomodoroSummary = {
  completed: number;
  goal: number;
};

export type HomeNotePreview = {
  id: string;
  title: string;
  source: string;
  updatedLabel: string;
};

export type HomeRecentWorkItem = {
  id: string;
  name: string;
  durationLabel: string;
  endedAtLabel: string;
};

export type HomeDashboardData = {
  userName: string;
  dateLabel: string;
  metrics: HomeSectionState<HomeMetric[]>;
  plan: HomeSectionState<HomePlanTask[]>;
  study: HomeSectionState<HomeStudySession[]>;
  habits: HomeSectionState<HomeHabit[]>;
  pomodoro: HomeSectionState<HomePomodoroSummary | null>;
  recentWork: HomeSectionState<HomeRecentWorkItem[]>;
  notes: HomeSectionState<HomeNotePreview[]>;
  dayClose: HomeSectionState<{
    summary: string;
    actions: string[];
  }>;
};
