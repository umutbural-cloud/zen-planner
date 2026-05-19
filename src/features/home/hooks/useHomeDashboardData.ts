import { Activity, BookOpen, Brain, CheckSquare, Clock3, Droplet, Smile, Timer, TrendingUp } from "lucide-react";
import { formatDurationLabel } from "@/features/home/lib/formatDurationLabel";
import type { HomeDashboardData } from "@/features/home/types";

export const useHomeDashboardData = (): HomeDashboardData => {
  const today = new Date();
  const day = today.toLocaleDateString("tr-TR", { day: "numeric" });
  const month = today.toLocaleDateString("tr-TR", { month: "long" });
  const weekday = today.toLocaleDateString("tr-TR", { weekday: "long" });
  const dateLabel = `${day} ${month} ${weekday}`;

  return {
    userName: "Umut",
    dateLabel,
    metrics: {
      status: "ready",
      data: [
        { id: "tasks", label: "Görev", value: "5", icon: CheckSquare, hint: "tamamlandı" },
        { id: "pomo", label: "Pomodoro", value: "4", icon: Timer, hint: "/ 6 hedef" },
        { id: "time", label: "Süre", value: formatDurationLabel(130), icon: Clock3, hint: "" },
        { id: "weekly-average", label: "Son 7 Gün Ort.", value: formatDurationLabel(105), icon: TrendingUp, hint: "" },
      ],
    },
    plan: {
      status: "ready",
      data: [
        { id: "1", title: "Haftalık içerik planı taslağı", tag: "İçerik Üretimi", done: true },
        { id: "2", title: "Ekip toplantısı notları", tag: "Topluluk", done: true },
        { id: "3", title: "Bülten taslağını bitir", tag: "Yayın Yönetimi" },
        { id: "4", title: "Sponsorluk teklifini gözden geçir", tag: "Planlama" },
        { id: "5", title: "Kamp görevi: Günlük yaz", tag: "Kamp" },
        { id: "6", title: "Haftalık değerlendirme notlarını toparla", tag: "Günlük" },
      ],
    },
    study: {
      status: "ready",
      data: [
        { id: "1", label: "Haftalık içerik planı", minutes: 42 },
        { id: "2", label: "Ekip toplantısı", minutes: 25 },
        { id: "3", label: "Bülten taslağı", minutes: 18 },
      ],
    },
    habits: {
      status: "ready",
      data: [
        { id: "1", label: "Su iç", streak: 7, done: true, icon: Droplet, timeOfDay: "morning" },
        { id: "2", label: "Meditasyon", streak: 3, done: true, icon: Brain, timeOfDay: "morning" },
        { id: "3", label: "Kitap oku", icon: BookOpen, timeOfDay: "evening" },
        { id: "4", label: "Spor / esneme", icon: Activity, timeOfDay: "noon" },
        { id: "5", label: "Diş fırçala", icon: Smile, timeOfDay: "night" },
      ],
    },
    pomodoro: {
      status: "ready",
      data: {
        completed: 4,
        goal: 6,
      },
    },
    recentWork: {
      status: "ready",
      data: [
        { id: "1", name: "Bülten taslağı", durationLabel: formatDurationLabel(42), endedAtLabel: "16:40" },
        { id: "2", name: "Ekip toplantısı", durationLabel: formatDurationLabel(25), endedAtLabel: "14:15" },
        { id: "3", name: "İçerik planı", durationLabel: formatDurationLabel(38), endedAtLabel: "11:20" },
      ],
    },
    notes: {
      status: "ready",
      data: [
        { id: "1", title: "Haftalık yayın notları", source: "Notlar", updatedLabel: "Bugün" },
        { id: "2", title: "Topluluk fikirleri", source: "Bilgi Merkezi", updatedLabel: "Dün" },
      ],
    },
    dayClose: {
      status: "ready",
      data: {
        summary: "Bugün 5 görev tamamladın · 2 sa 10 dk çalıştın · Akşam saatlerinde otomatik görünür",
        actions: ["Günü değerlendir", "Yarınki ilk görev", "Taşınmayanlar"],
      },
    },
  };
};
