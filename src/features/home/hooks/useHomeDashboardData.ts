import { Activity, BookOpen, Brain, CheckSquare, Clock3, Droplet, Flame, Smile, Timer } from "lucide-react";
import type { HomeDashboardData } from "@/features/home/types";

export const useHomeDashboardData = (): HomeDashboardData => {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    userName: "Umut",
    dateLabel,
    campDayLabel: "Disiplin yolculuğu · Kampın 6. günü",
    statusLabel: "İyi ilerliyorsun",
    streakDays: 12,
    metrics: {
      status: "ready",
      data: [
        { id: "tasks", label: "Görev", value: "5", icon: CheckSquare, hint: "tamamlandı" },
        { id: "pomo", label: "Pomodoro", value: "4", icon: Timer, hint: "/ 6 hedef" },
        { id: "time", label: "Süre", value: "2s10dk", icon: Clock3, hint: "çalışma" },
        { id: "streak", label: "Streak", value: "12", icon: Flame, hint: "gün" },
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
        { id: "1", label: "Su iç", streak: 7, done: true, icon: Droplet },
        { id: "2", label: "Meditasyon", streak: 3, done: true, icon: Brain },
        { id: "3", label: "Kitap oku", icon: BookOpen },
        { id: "4", label: "Spor / esneme", icon: Activity },
        { id: "5", label: "Diş fırçala", icon: Smile },
      ],
    },
    pomodoro: {
      status: "ready",
      data: {
        activeTaskTitle: "Bülten taslağını bitir",
        completed: 4,
        goal: 6,
        remainingLabel: "2 kaldı",
        timerLabel: "18:32",
        progress: 0.66,
      },
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
