import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useHabits, isHabitScheduledOn } from "@/hooks/useHabits";
import { useHabitCategories, colorHex } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";
import { parseISO } from "date-fns";

const JournalHabits = ({ date }: { date: string }) => {
  const { habits, completionsMap } = useHabits();
  const { categories } = useHabitCategories();
  const [open, setOpen] = useState(true);

  const target = parseISO(date);
  const completed = habits
    .filter((h) => isHabitScheduledOn(h, target) && completionsMap[h.id]?.has(date))
    .sort((a, b) => a.position - b.position);

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Sparkles className="h-3.5 w-3.5" />
        <span className="tracking-wide">Tamamlanan alışkanlıklar</span>
        <span className="text-muted-foreground/60">{completed.length}</span>
      </button>
      {open && (
        <div className="divide-y divide-border/40">
          {completed.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              <p>空 — Bu gün tamamlanan alışkanlık yok</p>
            </div>
          ) : (
            completed.map((h) => {
              const Icon = getHabitIcon(h.icon);
              const cat = categories.find((c) => c.id === h.category_id);
              return (
                <div key={h.id} className="flex items-center gap-2 px-3 py-2 text-sm font-light">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 truncate">{h.title}</span>
                  {cat && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorHex(cat.color) }} />
                      {cat.name}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default JournalHabits;
