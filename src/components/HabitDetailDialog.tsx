import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HabitIconPicker from "./HabitIconPicker";
import type { Habit, FrequencyType } from "@/hooks/useHabits";
import { TIME_OF_DAY_OPTIONS, type TimeOfDay } from "@/lib/timeOfDay";
import { useHabitCategories, colorHex } from "@/hooks/useHabitCategories";

const WEEK_DAYS = [
  { i: 1, l: "Pzt" }, { i: 2, l: "Sal" }, { i: 3, l: "Çar" }, { i: 4, l: "Per" },
  { i: 5, l: "Cum" }, { i: 6, l: "Cmt" }, { i: 0, l: "Paz" },
];

type Props = {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Habit>) => Promise<void> | void;
  onDelete?: (id: string) => void;
};

const HabitDetailDialog = ({ open, habit, onClose, onSave, onDelete }: Props) => {
  const [draft, setDraft] = useState<Partial<Habit>>({});
  const { categories } = useHabitCategories();

  useEffect(() => {
    if (habit) setDraft({
      title: habit.title,
      description: habit.description || "",
      icon: habit.icon,
      category_id: habit.category_id,
      frequency_type: habit.frequency_type,
      frequency_days: habit.frequency_days || [],
      time_of_day: habit.time_of_day,
    });
  }, [habit]);

  if (!habit) return null;

  const toggleDay = (d: number) => {
    const cur = new Set(draft.frequency_days || []);
    if (cur.has(d)) cur.delete(d); else cur.add(d);
    setDraft({ ...draft, frequency_days: Array.from(cur).sort((a, b) => a - b) });
  };

  const handleSave = async () => {
    await onSave(habit.id, draft);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide text-base">Alışkanlık</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">İkon</Label>
              <div className="mt-1 border border-border/60 rounded-sm">
                <HabitIconPicker value={draft.icon || "circle"} onChange={(v) => setDraft({ ...draft, icon: v })} size={20} />
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Ad</Label>
              <Input
                value={draft.title || ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="bg-transparent h-9 text-sm mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Kategori</Label>
            <Select
              value={draft.category_id ?? "__none__"}
              onValueChange={(v) => setDraft({ ...draft, category_id: v === "__none__" ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: colorHex(c.color) }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Sıklık</Label>
            <Select value={draft.frequency_type} onValueChange={(v: FrequencyType) => setDraft({ ...draft, frequency_type: v })}>
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Her gün</SelectItem>
                <SelectItem value="weekdays">Haftada belirli günler</SelectItem>
                <SelectItem value="weekly">Haftalık</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(draft.frequency_type === "weekdays" || draft.frequency_type === "weekly") && (
            <div>
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Günler</Label>
              <div className="flex gap-1 mt-1">
                {WEEK_DAYS.map((d) => {
                  const sel = (draft.frequency_days || []).includes(d.i);
                  return (
                    <button
                      key={d.i}
                      type="button"
                      onClick={() => toggleDay(d.i)}
                      className={`flex-1 h-8 text-xs rounded-sm border transition-colors ${
                        sel ? "bg-accent text-foreground border-accent" : "border-border/60 text-muted-foreground hover:bg-accent/30"
                      }`}
                    >{d.l}</button>
                  );
                })}
              </div>
            </div>
          )}

          {draft.frequency_type === "monthly" && (
            <div>
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Ayın günleri (1–31, virgülle)</Label>
              <Input
                value={(draft.frequency_days || []).join(",")}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 31);
                  setDraft({ ...draft, frequency_days: arr });
                }}
                className="bg-transparent h-9 text-sm mt-1"
                placeholder="1, 15"
              />
            </div>
          )}

          <div>
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Günün Dilimi</Label>
            <Select value={draft.time_of_day} onValueChange={(v: TimeOfDay) => setDraft({ ...draft, time_of_day: v })}>
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Herhangi</SelectItem>
                {TIME_OF_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label} <span className="text-muted-foreground/70">({o.range})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Açıklama</Label>
            <Textarea
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="bg-transparent text-sm mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onDelete && (
            <Button variant="ghost" className="text-destructive mr-auto" onClick={() => { onDelete(habit.id); onClose(); }}>
              Sil
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>İptal</Button>
          <Button onClick={handleSave}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HabitDetailDialog;
