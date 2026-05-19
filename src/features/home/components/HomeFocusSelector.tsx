import { Check, ChevronDown, Target } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DailyFocusOption } from "@/features/home/types";

type Props = {
  selectedFocus: string;
  focusOptions: DailyFocusOption[];
  onSelectFocus: (focus: string) => void;
};

const HomeFocusSelector = ({ selectedFocus, focusOptions, onSelectFocus }: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-left transition-colors hover:bg-accent/40"
        >
          <Target className="h-3 w-3" />
          <span className="shrink-0 text-xs text-muted-foreground">Bugünün odağı:</span>
          <span className="min-w-0 truncate text-xs text-foreground tracking-wide">{selectedFocus}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {focusOptions.map((focus) => {
          const active = selectedFocus === focus.label;

          return (
            <button
              key={focus.id}
              type="button"
              onClick={() => onSelectFocus(focus.label)}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors ${
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span className="flex-1">{focus.label}</span>
              {active && <Check className="h-3 w-3" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default HomeFocusSelector;
