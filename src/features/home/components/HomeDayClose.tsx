import { Moon } from "lucide-react";
import type { HomeDashboardData } from "@/features/home/types";

type Props = {
  dayClose: HomeDashboardData["dayClose"];
};

const HomeDayClose = ({ dayClose }: Props) => {
  if (dayClose.status === "loading") {
    return <section className="h-24 rounded-2xl border border-border/60 bg-card/40 animate-pulse" />;
  }

  if (dayClose.status === "error") {
    return <section className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-xs text-destructive">{dayClose.error || "Gün kapanışı yüklenemedi."}</section>;
  }

  if (dayClose.status === "empty") {
    return <section className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4 text-xs text-muted-foreground">Gün kapanışı için henüz veri yok.</section>;
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-card/70 to-card/40 backdrop-blur-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="h-9 w-9 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center text-muted-foreground">
          <Moon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm tracking-wide text-foreground">Günü Kapat</p>
          <p className="text-[11px] text-muted-foreground">{dayClose.data.summary}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dayClose.data.actions.map((action, index) => (
          <button
            key={action}
            type="button"
            className={`px-3 py-1.5 rounded-md border border-border/70 text-xs hover:bg-accent/40 transition-colors ${
              index === 0 ? "text-foreground/90" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
};

export default HomeDayClose;
