import { BriefcaseBusiness, CheckSquare, Clock3, TrendingUp } from "lucide-react";
import { formatDurationLabel } from "@/features/home/lib/formatDurationLabel";
import type { HomeDashboardData } from "@/features/home/types";
import { useAuth } from "@/hooks/useAuth";
import { useHomeWorkStats } from "@/features/home/hooks/useHomeWorkStats";
import { useHomeTasksData } from "@/features/home/hooks/useHomeTasksData";
import { useHomeHabitsData } from "@/features/home/hooks/useHomeHabitsData";

const getDisplayName = (email?: string, fullName?: unknown) => {
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0] || "Kullanıcı";
  return "Kullanıcı";
};

const getGreetingLabel = (hour: number) => {
  if (hour >= 6 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi Günler";
  if (hour >= 18) return "İyi Akşamlar";
  return "İyi Geceler";
};

export const useHomeDashboardData = (): HomeDashboardData => {
  const { user } = useAuth();
  const workStats = useHomeWorkStats();
  const tasksData = useHomeTasksData();
  const habitsData = useHomeHabitsData();
  const today = new Date();
  const day = today.toLocaleDateString("tr-TR", { day: "numeric" });
  const month = today.toLocaleDateString("tr-TR", { month: "long" });
  const weekday = today.toLocaleDateString("tr-TR", { weekday: "long" });
  const dateLabel = `${day} ${month} ${weekday}`;
  const metricsStatus =
    workStats.status === "loading" || tasksData.status === "loading"
      ? "loading"
      : workStats.status === "error" || tasksData.status === "error"
        ? "error"
        : "ready";

  return {
    userName: getDisplayName(user?.email, user?.user_metadata?.full_name),
    greetingLabel: getGreetingLabel(today.getHours()),
    dateLabel,
    metrics: {
      status: metricsStatus,
      error: workStats.error || tasksData.error,
      data: [
        { id: "tasks", label: "Görev", value: String(tasksData.data.completedTodayCount), icon: CheckSquare, hint: "" },
        { id: "work-count", label: "Çalışma Sayısı", value: String(workStats.data.todayCount), icon: BriefcaseBusiness, hint: "" },
        { id: "time", label: "Süre", value: formatDurationLabel(workStats.data.todayDurationSeconds / 60), icon: Clock3, hint: "" },
        { id: "weekly-average", label: "Son 7 Gün Ort.", value: formatDurationLabel(workStats.data.last7AverageSeconds / 60), icon: TrendingUp, hint: "" },
      ],
    },
    plan: {
      status: tasksData.status,
      data: tasksData.data.todo,
      error: tasksData.error,
      inProgress: tasksData.data.inProgress,
      reorderTasks: tasksData.reorderTasks,
      advanceTask: tasksData.advanceTask,
      completeTask: tasksData.completeTask,
    },
    study: {
      status: workStats.status,
      data: workStats.data.todaySessions,
      error: workStats.error,
    },
    habits: {
      status: habitsData.status,
      data: habitsData.data,
      error: habitsData.error,
    },
    habitsDefaultFilter: habitsData.defaultFilter,
    toggleHabit: habitsData.toggleHabit,
    pomodoro: {
      status: "ready",
      data: {},
    },
    recentWork: {
      status: workStats.status,
      data: workStats.data.recentWork,
      error: workStats.error,
    },
  };
};
