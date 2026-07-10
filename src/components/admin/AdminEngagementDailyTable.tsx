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
  | "meaningful_streak_3d_count"
  | "status";

type SortDirection = "asc" | "desc";

type CellState = {
  value: number | null;
  suppressed: boolean;
};

type RowStatus = "Tam" | "Kısmi" | "Yetersiz veri";

const sortLabels: Record<SortKey, string> = {
  snapshot_date: "Tarih",
  total_meaningful_activity_day: "Toplam",
  meaningful_active_day_count: "Kullanıcı",
  task_completion_activity_day: "Görev",
  manual_pomodoro_sessions_day: "Pomodoro",
  manual_pomodoro_minutes_day: "Pomodoro dk",
  habit_completion_activity_day: "Alışkanlık",
  meaningful_streak_3d_count: "3+ streak",
  status: "Durum",
};

const renderValue = (value: number | null | undefined, suppressed?: boolean) => {
  if (suppressed) return "Gizlendi";
  if (value === null || typeof value === "undefined") return "Gizlendi";
  return value.toLocaleString("tr-TR");
};

const getCells = (row: Row): Record<Exclude<SortKey, "snapshot_date" | "status">, CellState> => ({
  total_meaningful_activity_day: {
    value: row.total_meaningful_activity_day ?? null,
    suppressed: row.suppressed === true || row.total_meaningful_activity_day_suppressed === true,
  },
  meaningful_active_day_count: {
    value: row.meaningful_active_day_count ?? null,
    suppressed: row.suppressed === true || row.meaningful_active_day_count_suppressed === true,
  },
  task_completion_activity_day: {
    value: row.task_completion_activity_day ?? null,
    suppressed: row.suppressed === true || row.task_completion_activity_day_suppressed === true,
  },
  manual_pomodoro_sessions_day: {
    value: row.manual_pomodoro_sessions_day ?? null,
    suppressed: row.suppressed === true || row.manual_pomodoro_sessions_day_suppressed === true,
  },
  manual_pomodoro_minutes_day: {
    value: row.manual_pomodoro_minutes_day ?? null,
    suppressed: row.suppressed === true || row.manual_pomodoro_minutes_day_suppressed === true,
  },
  habit_completion_activity_day: {
    value: row.habit_completion_activity_day ?? null,
    suppressed: row.suppressed === true || row.habit_completion_activity_day_suppressed === true,
  },
  meaningful_streak_3d_count: {
    value: row.meaningful_streak_3d_count,
    suppressed: row.suppressed === true || row.meaningful_streak_3d_count_suppressed === true,
  },
});

const getRowStatus = (row: Row): RowStatus => {
  if (row.suppressed === true) return "Yetersiz veri";
  const cells = getCells(row);
  return Object.values(cells).some((cell) => cell.suppressed || cell.value === null) ? "Kısmi" : "Tam";
};

const getSortableValue = (row: Row, key: SortKey): number | string | null => {
  if (key === "snapshot_date") return row.snapshot_date;
  if (key === "status") return getRowStatus(row);

  const cell = getCells(row)[key];
  if (cell.suppressed || cell.value === null) return null;
  return cell.value;
};

const compareRows = (a: Row, b: Row, key: SortKey, direction: SortDirection) => {
  const aValue = getSortableValue(a, key);
  const bValue = getSortableValue(b, key);
  const aMissing = aValue === null;
  const bMissing = bValue === null;

  if (aMissing && bMissing) return b.snapshot_date.localeCompare(a.snapshot_date);
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (key === "status") {
    const statusRank: Record<RowStatus, number> = {
      Tam: 0,
      Kısmi: 1,
      "Yetersiz veri": 2,
    };
    const comparison = statusRank[aValue as RowStatus] - statusRank[bValue as RowStatus];
    return direction === "asc" ? comparison : -comparison;
  }

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
                {renderHeader("status")}
              </tr>
            </thead>
            <tbody>
              {sortedSeries.map((row) => {
                const cells = getCells(row);
                const rowStatus = getRowStatus(row);
                return (
                  <tr key={row.snapshot_date} className="border-b border-border/40 last:border-b-0">
                    <td className="py-3 pr-4 text-foreground">{row.snapshot_date}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.total_meaningful_activity_day.value, cells.total_meaningful_activity_day.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.meaningful_active_day_count.value, cells.meaningful_active_day_count.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.task_completion_activity_day.value, cells.task_completion_activity_day.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.manual_pomodoro_sessions_day.value, cells.manual_pomodoro_sessions_day.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.manual_pomodoro_minutes_day.value, cells.manual_pomodoro_minutes_day.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.habit_completion_activity_day.value, cells.habit_completion_activity_day.suppressed)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {renderValue(cells.meaningful_streak_3d_count.value, cells.meaningful_streak_3d_count.suppressed)}
                    </td>
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
};
