import { ReactNode } from "react";
import { addSeconds, format, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export type MobileWorkHistoryEntry = {
  id: string;
  title: string;
  subtitle: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  color?: string | null;
};

type MobileWorkHistoryDaySectionProps = {
  date: Date;
  totalSeconds: number;
  entries: MobileWorkHistoryEntry[];
  footer?: ReactNode;
  emptyLabel?: string;
};

const FALLBACK_BAR_COLOR = "hsl(var(--muted-foreground) / 0.35)";

const formatDayHeading = (date: Date) => {
  if (isToday(date)) return `Bugün, ${format(date, "d MMMM", { locale: tr })}`;
  if (isYesterday(date)) return `Dün, ${format(date, "d MMMM", { locale: tr })}`;
  return format(date, "d MMMM, EEEE", { locale: tr });
};

const formatCompactDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}s ${minutes}d`;
  if (hours > 0) return `${hours}s`;
  if (minutes > 0) return `${minutes}d`;
  return `${safeSeconds}s`;
};

const formatTimeRange = (entry: MobileWorkHistoryEntry) => {
  const start = parseISO(entry.startedAt);
  const end = entry.endedAt ? parseISO(entry.endedAt) : addSeconds(start, entry.durationSeconds);
  return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
};

export const MobileWorkHistoryDaySection = ({
  date,
  totalSeconds,
  entries,
  footer,
  emptyLabel = "Kayıt yok",
}: MobileWorkHistoryDaySectionProps) => {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-medium tracking-[-0.01em] text-foreground">
          {formatDayHeading(date)}
        </h3>
        <span className="shrink-0 rounded-full border border-border/60 bg-muted/45 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          Toplam: {totalSeconds > 0 ? formatCompactDuration(totalSeconds) : "—"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        {entries.length > 0 ? (
          <div className="divide-y divide-border/45">
            {entries.map((entry) => (
              <div key={entry.id} className="flex min-h-[72px] items-center gap-3 px-3.5 py-3">
                <span
                  className="h-11 w-1.5 shrink-0 rounded-full"
                  style={{ background: entry.color || FALLBACK_BAR_COLOR }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug tracking-[-0.01em] text-foreground">
                    {entry.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {entry.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCompactDuration(entry.durationSeconds)}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {formatTimeRange(entry)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 text-xs italic text-muted-foreground/60">{emptyLabel}</div>
        )}
        {footer ? <div className="border-t border-border/45">{footer}</div> : null}
      </div>
    </section>
  );
};
