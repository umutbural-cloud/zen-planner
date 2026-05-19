import type { HomeSectionState, HomeMetric } from "@/features/home/types";

type Props = {
  metrics: HomeSectionState<HomeMetric[]>;
};

const HomeMetrics = ({ metrics }: Props) => {
  if (metrics.status === "loading") {
    return <section className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl border border-border/60 bg-card/40 animate-pulse" />)}</section>;
  }

  if (metrics.status === "error") {
    return <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">{metrics.error || "Metrikler yüklenemedi."}</section>;
  }

  if (metrics.status === "empty" || metrics.data.length === 0) {
    return <section className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-xs text-muted-foreground">Bugün için metrik yok.</section>;
  }

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.data.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.id}
            className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3.5 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {metric.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extralight tabular-nums tracking-tight leading-tight text-foreground">
                {metric.value}
              </span>
              {metric.hint && <span className="text-[10px] text-muted-foreground tracking-wide">{metric.hint}</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default HomeMetrics;
