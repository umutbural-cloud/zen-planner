import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminEngagementOverviewCards } from "@/components/admin/AdminEngagementOverviewCards";
import { AdminEngagementTrendChart } from "@/components/admin/AdminEngagementTrendChart";
import { AdminEngagementDailyTable } from "@/components/admin/AdminEngagementDailyTable";
import { AdminEngagementEmptyState } from "@/components/admin/AdminEngagementEmptyState";

type AdminEngagementSectionProps = {
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
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
};

export const AdminEngagementSection = ({
  latest,
  series,
  releaseEvents,
  isLoading,
  error,
  onRetry,
}: AdminEngagementSectionProps) => {
  return (
    <div className="space-y-4">
      <Card className="rounded-none border-border/70 shadow-none">
        <CardContent className="px-5 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Bu bölüm kişisel içerikleri göstermez. Task, manual timer pomodoro ve habit completion kayıtlarından yalnızca
            aggregate kullanım metadataları hesaplanır. Günlük snapshotlar tamamlanmış Europe/Istanbul takvim günleri için
            üretilir.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <AdminEngagementEmptyState error onRetry={onRetry} />
      ) : isLoading && !latest ? (
        <Card className="rounded-none border-border/70 shadow-none">
          <CardContent className="px-5 py-5">
            <div className="space-y-3">
              <div className="h-4 w-56 bg-muted/80" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-28 border border-border/60 bg-muted/30" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !latest ? (
        <AdminEngagementEmptyState onRetry={onRetry} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <AdminEngagementOverviewCards latest={latest} />
              <Card className="rounded-none border-border/70 shadow-none">
                <CardHeader className="space-y-1 p-5">
                  <CardTitle className="text-base font-medium tracking-wide">Son 7 gün trend</CardTitle>
                  <p className="text-sm text-muted-foreground">Null noktalar 0 çizilmez. Gizli değerler atlanır.</p>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <AdminEngagementTrendChart series={series} />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-none border-border/70 shadow-none">
              <CardHeader className="space-y-1 p-5">
                <CardTitle className="text-base font-medium tracking-wide">Ops kayıtlı release olayları</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Bu liste karşılaştırma değil, yalnızca ops kayıtlı release event özetidir.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 pt-0">
                {releaseEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz kayıtlı release yok.</p>
                ) : (
                  releaseEvents.map((releaseEvent) => (
                    <div key={releaseEvent.id} className="border border-border/60 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{releaseEvent.release_name}</p>
                          <p className="text-xs text-muted-foreground">{releaseEvent.release_type}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{releaseEvent.deployed_at}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <AdminEngagementDailyTable series={series} />
        </div>
      )}
    </div>
  );
};
