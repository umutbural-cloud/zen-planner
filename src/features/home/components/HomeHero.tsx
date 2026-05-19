import { Flame, Sparkles, Target } from "lucide-react";
import HomeFocusSelector from "@/features/home/components/HomeFocusSelector";
import type { DailyFocusOption } from "@/features/home/types";

type Props = {
  name: string;
  dateLabel: string;
  campDayLabel: string;
  statusLabel: string;
  streakDays: number;
  selectedFocus: string;
  focusOptions: DailyFocusOption[];
  onSelectFocus: (focus: string) => void;
};

const HomeHero = ({
  name,
  dateLabel,
  campDayLabel,
  statusLabel,
  streakDays,
  selectedFocus,
  focusOptions,
  onSelectFocus,
}: Props) => {
  return (
    <section className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border)/0.4)_inset] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02]" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 p-6 lg:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            <Sparkles className="h-3 w-3" />
            <span>Operasyon Merkezi</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-wide text-foreground">
            Günaydın, <span className="font-normal">{name}</span>
            <span className="ml-2 text-muted-foreground">👋</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-light">
            Bugünü kapatmaya hazır mısın? · {campDayLabel}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Bugünün odağı:</span>
            <span className="text-xs text-foreground tracking-wide">{selectedFocus}</span>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3 lg:min-w-[220px]">
          <div className="text-xs text-muted-foreground tracking-wide">{dateLabel}</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-1 text-[11px] tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {statusLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-400 px-2.5 py-1 text-[11px] tracking-wide">
              <Flame className="h-3 w-3" />
              {streakDays} günlük seri
            </span>
          </div>
        </div>
      </div>

      <HomeFocusSelector
        selectedFocus={selectedFocus}
        focusOptions={focusOptions}
        onSelectFocus={onSelectFocus}
      />
    </section>
  );
};

export default HomeHero;
