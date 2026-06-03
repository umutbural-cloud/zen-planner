import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { Check } from "lucide-react";

interface Props {
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
  align?: "start" | "center" | "end";
}

export const CategoryColorPicker = ({ value, onChange, size = "md", align = "start" }: Props) => {
  const dim = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Renk seç"
          className={`${dim} rounded-full border border-border/60 hover:ring-2 hover:ring-foreground/20 transition-all`}
          style={{ background: colorHex(value) }}
        />
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-3">
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Renk</div>
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORY_COLORS.map((col) => {
            const active = col.key === value;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => onChange(col.key)}
                title={col.label}
                className={`relative h-6 w-6 rounded-full border transition-all ${
                  active ? "border-foreground/60 scale-110" : "border-border/60 hover:scale-105"
                }`}
                style={{ background: col.hex }}
              >
                {active && (
                  <Check
                    className="absolute inset-0 m-auto h-3.5 w-3.5"
                    style={{ color: col.key.startsWith("pastel-") || ["yellow", "lime", "amber", "orange"].includes(col.key) ? "#1c1917" : "#fff" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
