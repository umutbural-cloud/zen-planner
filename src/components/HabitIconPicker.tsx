import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { HABIT_ICON_GROUPS, getHabitIcon } from "@/lib/habitIcons";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { Check } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  size?: number;
  color?: string | null;
  onColorChange?: (c: string) => void;
};

const HabitIconPicker = ({ value, onChange, size = 18, color, onColorChange }: Props) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const Current = getHabitIcon(value);
  const ql = q.trim().toLowerCase();
  const tint = color ? colorHex(color) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-sm hover:bg-accent/50 transition-colors"
          style={{ color: tint }}
          title="İkon seç"
        >
          <Current style={{ width: size, height: size }} strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 max-h-[60vh] overflow-y-auto" align="start">
        {onColorChange && (
          <div className="mb-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1 px-1">Renk</div>
            <div className="flex flex-wrap gap-1 px-1">
              {CATEGORY_COLORS.map((c) => {
                const active = c.key === color;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onColorChange(c.key)}
                    title={c.label}
                    className="w-5 h-5 rounded-full flex items-center justify-center border border-border/40 transition-transform hover:scale-110"
                    style={{ background: c.hex }}
                  >
                    {active && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İkon ara..."
          className="h-8 text-xs mb-2"
        />
        {HABIT_ICON_GROUPS.map((g) => {
          const filtered = ql
            ? g.icons.filter((i) => i.label.toLowerCase().includes(ql) || i.name.includes(ql))
            : g.icons;
          if (filtered.length === 0) return null;
          return (
            <div key={g.label} className="mb-2">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1 px-1">{g.label}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {filtered.map((i) => {
                  const Icon = i.icon;
                  const active = i.name === value;
                  return (
                    <button
                      key={i.name}
                      type="button"
                      onClick={() => { onChange(i.name); setOpen(false); }}
                      title={i.label}
                      className={`flex items-center justify-center w-8 h-8 rounded-sm transition-colors ${
                        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                      style={active && tint ? { color: tint } : undefined}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default HabitIconPicker;
