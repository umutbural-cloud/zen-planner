import HomeFocusSelector from "@/features/home/components/HomeFocusSelector";
import type { DailyFocusOption } from "@/features/home/types";

type Props = {
  name: string;
  greetingLabel: string;
  dateLabel: string;
  selectedFocus: string;
  selectedFocusOption?: DailyFocusOption;
  focusOptions: DailyFocusOption[];
  onSelectFocus: (focus: string) => void;
};

const HomeHero = ({
  name,
  greetingLabel,
  dateLabel,
  selectedFocus,
  selectedFocusOption,
  focusOptions,
  onSelectFocus,
}: Props) => {
  return (
    <section className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border)/0.4)_inset] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02]" />

      <div className="relative p-6 lg:p-8">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/75">
            {dateLabel}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-wide text-foreground">
            {greetingLabel}, <span className="font-normal">{name}</span>
            <span className="ml-2 text-muted-foreground">👋</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-light">
            Bugünü kapatmaya hazır mısın?
          </p>

          <HomeFocusSelector
            selectedFocus={selectedFocus}
            selectedFocusOption={selectedFocusOption}
            focusOptions={focusOptions}
            onSelectFocus={onSelectFocus}
          />
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
