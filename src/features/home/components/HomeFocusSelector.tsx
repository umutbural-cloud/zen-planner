import { Target } from "lucide-react";
import type { DailyFocusOption } from "@/features/home/types";

type Props = {
  selectedFocus: string;
  focusOptions: DailyFocusOption[];
  onSelectFocus: (focus: string) => void;
};

const HomeFocusSelector = ({ selectedFocus, focusOptions, onSelectFocus }: Props) => {
  return (
    <div className="relative border-t border-border/60 px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 shrink-0">
          <Target className="h-3 w-3" />
          Odak listesi
        </span>
        <div className="h-3 w-px bg-border/60 mx-1" />
        {focusOptions.map((focus) => {
          const active = selectedFocus === focus.label;

          return (
            <button
              key={focus.id}
              type="button"
              onClick={() => onSelectFocus(focus.label)}
              className={`shrink-0 text-xs px-3 py-1 rounded-md border transition-colors ${
                active
                  ? "bg-foreground/10 border-foreground/20 text-foreground"
                  : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {active ? `✓ ${focus.label}` : focus.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomeFocusSelector;
