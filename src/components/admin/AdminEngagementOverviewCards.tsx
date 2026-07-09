import { Card, CardContent } from "@/components/ui/card";

type OverviewCardProps = {
  title: string;
  value: string;
  description: string;
  muted?: boolean;
};

const OverviewCard = ({ title, value, description, muted = false }: OverviewCardProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardContent className="px-4 py-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={`text-2xl font-medium tracking-tight ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {value}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
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
        title="Presence active — son final gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.presence_active_day_count, false)}
        description="Uygulamada görünen eligible kullanıcı sayısı."
        muted={suppressed}
      />
      <OverviewCard
        title="Meaningful active — son final gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_active_day_count, false)}
        description="Task, manual timer pomodoro veya habit completion yapan kullanıcılar."
        muted={suppressed}
      />
      <OverviewCard
        title="Meaningful active — son 7 gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_active_7d_count, false)}
        description="Son tamamlanmış 7 günün aggregate meaningful active sayısı."
        muted={suppressed}
      />
      <OverviewCard
        title="Task completion activity — son 7 gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.task_completion_activity_7d, false)}
        description="State-based task completion hacmi."
        muted={suppressed}
      />
      <OverviewCard
        title="Manual timer pomodoro — son 7 gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.manual_pomodoro_sessions_7d, false)}
        description="Geçerli manual timer work session sayısı."
        muted={suppressed}
      />
      <OverviewCard
        title="Habit completion activity — son 7 gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.habit_completion_activity_7d, false)}
        description="Habit completion record hacmi."
        muted={suppressed}
      />
      <OverviewCard
        title="3+ meaningful streak"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.meaningful_streak_3d_count, false)}
        description="Son 7 final günde en az 3 ardışık meaningful day yapan kullanıcılar."
        muted={suppressed}
      />
      <OverviewCard
        title="Settings adoption proxy — son 7 gün"
        value={suppressed ? "Yetersiz veri" : renderValue(latest?.settings_adoption_proxy_7d_count, false)}
        description="Ayar kaydı güncellenen eligible kullanıcı sayısı; engagement score bileşeni değildir."
        muted={suppressed}
      />
    </div>
  );
};
