import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  snapshot_date: string;
  meaningful_active_7d_count: number | null;
  meaningful_active_7d_count_suppressed?: boolean;
  task_completion_activity_7d: number | null;
  task_completion_activity_7d_suppressed?: boolean;
  manual_pomodoro_sessions_7d: number | null;
  manual_pomodoro_sessions_7d_suppressed?: boolean;
  habit_completion_activity_7d: number | null;
  habit_completion_activity_7d_suppressed?: boolean;
  meaningful_streak_3d_count: number | null;
  meaningful_streak_3d_count_suppressed?: boolean;
  suppressed?: boolean;
};

type AdminEngagementDailyTableProps = {
  series: Row[];
};

const renderValue = (value: number | null, suppressed?: boolean) => {
  if (suppressed) return "Gizlendi";
  if (value === null) return "Gizlendi";
  return value.toLocaleString("tr-TR");
};

export const AdminEngagementDailyTable = ({ series }: AdminEngagementDailyTableProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-1 p-5">
      <CardTitle className="text-base font-medium tracking-wide">Son 30 gün günlük özet</CardTitle>
      <p className="text-sm text-muted-foreground">Tamamlanmış Istanbul günleri üzerinden hesaplanan aggregate tablo.</p>
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Tarih</th>
              <th className="py-3 pr-4 font-medium">Meaningful active 7G</th>
              <th className="py-3 pr-4 font-medium">Task activity 7G</th>
              <th className="py-3 pr-4 font-medium">Manual Pomodoro 7G</th>
              <th className="py-3 pr-4 font-medium">Habit activity 7G</th>
              <th className="py-3 pr-4 font-medium">3+ streak</th>
              <th className="py-3 pr-4 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => {
              const cellSuppressed = {
                meaningfulActive: row.suppressed === true || row.meaningful_active_7d_count_suppressed === true,
                taskActivity: row.suppressed === true || row.task_completion_activity_7d_suppressed === true,
                pomodoro: row.suppressed === true || row.manual_pomodoro_sessions_7d_suppressed === true,
                habitActivity: row.suppressed === true || row.habit_completion_activity_7d_suppressed === true,
                streak: row.suppressed === true || row.meaningful_streak_3d_count_suppressed === true,
              };
              const hasPartialSuppression =
                !row.suppressed &&
                [
                  cellSuppressed.meaningfulActive,
                  cellSuppressed.taskActivity,
                  cellSuppressed.pomodoro,
                  cellSuppressed.habitActivity,
                  cellSuppressed.streak,
                ].some(Boolean);
              const rowStatus = row.suppressed === true ? "Yetersiz veri" : hasPartialSuppression ? "Kısmi" : "Tam";
              return (
                <tr key={row.snapshot_date} className="border-b border-border/40 last:border-b-0">
                  <td className="py-3 pr-4 text-foreground">{row.snapshot_date}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {renderValue(row.meaningful_active_7d_count, cellSuppressed.meaningfulActive)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {renderValue(row.task_completion_activity_7d, cellSuppressed.taskActivity)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {renderValue(row.manual_pomodoro_sessions_7d, cellSuppressed.pomodoro)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {renderValue(row.habit_completion_activity_7d, cellSuppressed.habitActivity)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{renderValue(row.meaningful_streak_3d_count, cellSuppressed.streak)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{rowStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);
