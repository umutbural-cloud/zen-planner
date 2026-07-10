import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  snapshot_date: string;
  meaningful_active_day_count?: number | null;
  meaningful_active_day_count_suppressed?: boolean;
  task_completion_activity_day?: number | null;
  task_completion_activity_day_suppressed?: boolean;
  manual_pomodoro_sessions_day?: number | null;
  manual_pomodoro_sessions_day_suppressed?: boolean;
  manual_pomodoro_minutes_day?: number | null;
  manual_pomodoro_minutes_day_suppressed?: boolean;
  habit_completion_activity_day?: number | null;
  habit_completion_activity_day_suppressed?: boolean;
  total_meaningful_activity_day?: number | null;
  total_meaningful_activity_day_suppressed?: boolean;
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

type SortKey =
  | "snapshot_date"
  | "total_meaningful_activity_day"
  | "meaningful_active_day_count"
  | "task_completion_activity_day"
  | "manual_pomodoro_sessions_day"
  | "manual_pomodoro_minutes_day"
  | "habit_completion_activity_day"
  | "meaningful_streak_3d_count";

type SortDirection = "asc" | "desc";

const sortLabels: Record<SortKey, string> = {
  snapshot_date: "Tarih",
  total_meaningful_activity_day: "Toplam",
  meaningful_active_day_count: "Kullanıcı",
  task_completion_activity_day: "Görev",
  manual_pomodoro_sessions_day: "Pomodoro",
  manual_pomodoro_minutes_day: "Pomodoro dk",
  habit_completion_activity_day: "Alışkanlık",
  meaningful_streak_3d_count: "3+ streak",
};

const toDisplayNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const renderValue = (value: number | null | undefined) => toDisplayNumber(value).toLocaleString("tr-TR");

const getCells = (row: Row): Record<Exclude<SortKey, "snapshot_date">, number> => ({
  total_meaningful_activity_day: toDisplayNumber(row.total_meaningful_activity_day),
  meaningful_active_day_count: toDisplayNumber(row.meaningful_active_day_count),
  task_completion_activity_day: toDisplayNumber(row.task_completion_activity_day),
  manual_pomodoro_sessions_day: toDisplayNumber(row.manual_pomodoro_sessions_day),
  manual_pomodoro_minutes_day: toDisplayNumber(row.manual_pomodoro_minutes_day),
  habit_completion_activity_day: toDisplayNumber(row.habit_completion_activity_day),
  meaningful_streak_3d_count: toDisplayNumber(row.meaningful_streak_3d_count),
});

const getSortableValue = (row: Row, key: SortKey): number | string => {
  if (key === "snapshot_date") return row.snapshot_date;
  return getCells(row)[key];
};

const compareRows = (a: Row, b: Row, key: SortKey, direction: SortDirection) => {
  const aValue = getSortableValue(a, key);
  const bValue = getSortableValue(b, key);

  const comparison =
    typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue));

  return direction === "asc" ? comparison : -comparison;
};

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />;
  return direction === "asc" ? (
    <ArrowUp className="h-3 w-3" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3 w-3" aria-hidden="true" />
  );
};

export const AdminEngagementDailyTable = ({ series }: AdminEngagementDailyTableProps) => {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "snapshot_date",
    direction: "desc",
  });

  const sortedSeries = useMemo(
    () => [...series].sort((a, b) => compareRows(a, b, sort.key, sort.direction)),
    [series, sort.direction, sort.key],
  );

  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const renderHeader = (key: SortKey, className = "") => (
    <th className={`py-3 pr-4 font-medium ${className}`}>
      <button
        type="button"
        className="inline-flex min-w-0 items-center gap-1 text-left text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(key)}
        aria-label={`${sortLabels[key]} sıralamasını değiştir`}
      >
        <span className="whitespace-nowrap">{sortLabels[key]}</span>
        <SortIcon active={sort.key === key} direction={sort.direction} />
      </button>
    </th>
  );

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="space-y-1 p-5">
        <CardTitle className="text-base font-medium tracking-wide">Son 30 gün günlük özet</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toplam anlamlı aktivite = görev tamamlanma + manual timer pomodoro session + alışkanlık tamamlama. Pomodoro
          dakikası toplam skora dahil değildir.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {renderHeader("snapshot_date")}
                {renderHeader("total_meaningful_activity_day")}
                {renderHeader("meaningful_active_day_count")}
                {renderHeader("task_completion_activity_day")}
                {renderHeader("manual_pomodoro_sessions_day")}
                {renderHeader("manual_pomodoro_minutes_day")}
                {renderHeader("habit_completion_activity_day")}
                {renderHeader("meaningful_streak_3d_count")}
              </tr>
            </thead>
            <tbody>
              {sortedSeries.map((row) => {
                const cells = getCells(row);
                return (
                  <tr key={row.snapshot_date} className="border-b border-border/40 last:border-b-0">
                    <td className="py-3 pr-4 text-foreground">{row.snapshot_date}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.total_meaningful_activity_day)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.meaningful_active_day_count)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.task_completion_activity_day)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.manual_pomodoro_sessions_day)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.manual_pomodoro_minutes_day)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.habit_completion_activity_day)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.meaningful_streak_3d_count)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
