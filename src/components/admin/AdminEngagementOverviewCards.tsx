import { Card, CardContent } from "@/components/ui/card";

type OverviewCardProps = {
  value: string;
  period: string;
  description: string;
  muted?: boolean;
};

const OverviewCard = ({ value, period, description, muted = false }: OverviewCardProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardContent className="flex h-full flex-col px-4 py-5">
      <div className="space-y-2">
        <p className={`text-3xl font-medium tracking-tight ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{period}</p>
      </div>
      <div className="my-4 border-t border-border/60" />
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const renderValue = (value: number | null | undefined, suppressed?: boolean) => {
  if (suppressed) return "Yetersiz veri";
  if (value === null || value === undefined) return "Gizlendi";
  return value.toLocaleString("tr-TR");
};

export type AdminEngagementOverviewData = {
  latest: {
    snapshot_date: string;
    metric_version: string;
    snapshot_kind: string;
    compute_mode: string;
    computed_lag_days: number;
    eligible_user_count: number;
    suppressed: boolean;
    presence_active_day_count: number | null;
    meaningful_active_day_count: number | null;
    meaningful_active_7d_count: number | null;
    meaningful_active_30d_count: number | null;
    task_completion_activity_7d: number | null;
    manual_pomodoro_sessions_7d: number | null;
    manual_pomodoro_minutes_7d: number | null;
    habit_completion_activity_7d: number | null;
    meaningful_streak_3d_count: number | null;
    settings_adoption_proxy_7d_count: number | null;
  } | null;
  series: Array<{
    snapshot_date: string;
    meaningful_active_7d_count: number | null;
    task_completion_activity_7d: number | null;
    manual_pomodoro_sessions_7d: number | null;
    habit_completion_activity_7d: number | null;
    meaningful_streak_3d_count: number | null;
    suppressed?: boolean;
  }>;
  releaseEvents: Array<{
    id: string;
    release_name: string;
    release_type: string;
    deployed_at: string;
  }>;
};

type AdminEngagementOverviewCardsProps = {
  latest: AdminEngagementOverviewData["latest"];
};

export const AdminEngagementOverviewCards = ({ latest }: AdminEngagementOverviewCardsProps) => {
  const suppressed = latest?.suppressed === true;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.presence_active_day_count, false)}
        period="Son gün"
        description="Uygulamada görünen kullanıcı."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_active_day_count, false)}
        period="Son gün"
        description="Anlamlı aktivite yapan kullanıcı."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_active_7d_count, false)}
        period="Son 7 gün"
        description="Son 7 günde aktif kullanıcı."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.task_completion_activity_7d, false)}
        period="Son 7 gün"
        description="Tamamlanan görev sayısı."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.manual_pomodoro_sessions_7d, false)}
        period="Son 7 gün"
        description="Manual timer çalışma oturumu."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.habit_completion_activity_7d, false)}
        period="Son 7 gün"
        description="Tamamlanan alışkanlık sayısı."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_streak_3d_count, false)}
        period="Son 7 gün"
        description="En az 3 gün üst üste aktif."
        muted={suppressed}
      />
      <OverviewCard
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.settings_adoption_proxy_7d_count, false)}
        period="Son 7 gün"
        description="Ayar kaydı güncellenen kullanıcı."
        muted={suppressed}
      />
    </div>
  );
};
