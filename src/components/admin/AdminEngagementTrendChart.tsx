type TrendPoint = {
  snapshot_date: string;
  meaningful_active_7d_count: number | null;
  task_completion_activity_7d: number | null;
  manual_pomodoro_sessions_7d: number | null;
  habit_completion_activity_7d: number | null;
  meaningful_streak_3d_count: number | null;
  suppressed?: boolean;
};

type AdminEngagementTrendChartProps = {
  series: TrendPoint[];
};

const metricKeyLabel: Array<{
  key: keyof Omit<TrendPoint, "snapshot_date" | "suppressed">;
  label: string;
}> = [
  { key: "meaningful_active_7d_count", label: "Aktif kullanıcı" },
  { key: "task_completion_activity_7d", label: "Görev" },
  { key: "manual_pomodoro_sessions_7d", label: "Pomodoro" },
  { key: "habit_completion_activity_7d", label: "Alışkanlık" },
  { key: "meaningful_streak_3d_count", label: "3+ seri" },
];

const toBarWidth = (value: number | null, max: number) => {
  if (value === null || max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
};

export const AdminEngagementTrendChart = ({ series }: AdminEngagementTrendChartProps) => {
  const latestSeven = series.slice(-7);
  const values = latestSeven.flatMap((point) =>
    metricKeyLabel.map(({ key }) => point[key]).filter((value): value is number => typeof value === "number"),
  );
  const max = values.length > 0 ? Math.max(...values) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {metricKeyLabel.map((metric) => (
          <div key={metric.key} className="inline-flex items-center gap-2 border border-border/60 px-2 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 bg-border" />
            {metric.label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {latestSeven.map((point) => (
          <div key={point.snapshot_date} className="grid gap-2 rounded-none border border-border/60 px-3 py-3 md:grid-cols-[90px_minmax(0,1fr)] md:items-center">
            <div className="text-xs text-muted-foreground">{point.snapshot_date}</div>
            <div className="space-y-2">
              {metricKeyLabel.map((metric) => {
                const value = point[metric.key];
                const suppressed = point.suppressed === true || value === null;
                const width = toBarWidth(value, max);

                return (
                  <div key={metric.key} className="grid items-center gap-2 sm:grid-cols-[140px_minmax(0,1fr)_72px]">
                    <span className="truncate text-xs text-muted-foreground">{metric.label}</span>
                    <div className="h-2 overflow-hidden bg-muted/70">
                      {suppressed ? (
                        <div className="h-full w-full bg-border/40" />
                      ) : (
                        <div className="h-full bg-foreground/70" style={{ width: `${width}%` }} />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground sm:text-right">
                      {suppressed ? "Gizlendi" : value.toLocaleString("tr-TR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
