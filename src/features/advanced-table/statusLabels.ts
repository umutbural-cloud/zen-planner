import type { TaskStatus } from "@/hooks/useTasks";

export const formatTaskStatus = (status: TaskStatus | string) => {
  switch (status) {
    case "todo":
      return "Plan";
    case "in_progress":
      return "Aktif";
    case "done":
      return "Tamamlandı";
    default:
      return String(status || "Bilinmeyen");
  }
};
