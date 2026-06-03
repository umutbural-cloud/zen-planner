import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Settings2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHabits, type Habit, type FrequencyType } from "@/hooks/useHabits";
import { useHabitCategories, CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import HabitIconPicker from "./HabitIconPicker";
import HabitDetailDialog from "./HabitDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryColorPicker } from "./CategoryColorPicker";
import { useTimeOfDayRanges, type TimeOfDay, timeOfDayLabel } from "@/lib/timeOfDay";

const FREQ_LABEL: Record<FrequencyType, string> = {
  daily: "Her gün",
  weekdays: "Belirli günler",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const HabitsBoard = () => {
  const { habits, loading, createHabit, updateHabit, deleteHabit, moveHabit } = useHabits();
  const { options: todOptions } = useTimeOfDayRanges();
  const { categories, createCategory, updateCategory, deleteCategory } = useHabitCategories();
  const [newTitle, setNewTitle] = useState("");
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const sorted = [...habits].sort((a, b) => a.position - b.position);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createHabit({ title: newTitle.trim() });
    setNewTitle("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Yeni alışkanlık..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setManageOpen(true)} className="h-9" title="Kategorileri yönet">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="divide-y divide-border/40">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 px-3 py-3">
                <div className="h-5 w-5 rounded-sm bg-muted/60 animate-pulse" />
                <div className="h-5 w-5 rounded-sm bg-muted/70 animate-pulse" />
                <div className="h-4 flex-1 rounded-sm bg-muted/70 animate-pulse" />
                <div className="hidden sm:block h-4 w-24 rounded-sm bg-muted/60 animate-pulse" />
                <div className="hidden md:block h-4 w-28 rounded-sm bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">Boş</p>
          <p className="text-xs">Henüz alışkanlık eklenmedi</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-light tracking-wide">Alışkanlık</TableHead>
                <TableHead className="text-xs font-light tracking-wide hidden sm:table-cell w-32">Kategori</TableHead>
                <TableHead className="text-xs font-light tracking-wide hidden sm:table-cell w-40">Sıklık</TableHead>
                <TableHead className="text-xs font-light tracking-wide hidden md:table-cell w-44">Günün Dilimi</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h, i) => {
                const cat = categories.find((c) => c.id === h.category_id);
                return (
                <TableRow key={h.id} className="group">
                  <TableCell className="px-1 py-1">
                    <div className="flex flex-col">
                      <button onClick={() => moveHabit(h.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveHabit(h.id, 1)} disabled={i === sorted.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1">
                    <HabitIconPicker value={h.icon} onChange={(v) => updateHabit(h.id, { icon: v })} />
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1">
                    <button
                      onClick={() => setOpenHabit(h)}
                      className="text-sm font-light text-left w-full hover:underline"
                    >
                      {h.title}
                    </button>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 hidden sm:table-cell">
                    <Select
                      value={h.category_id ?? "__none__"}
                      onValueChange={(v) => updateHabit(h.id, { category_id: v === "__none__" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs border-none bg-transparent shadow-none focus:ring-0 px-1">
                        <SelectValue>
                          {cat ? (
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ background: colorHex(cat.color) }} />
                              {cat.name}
                            </span>
                          ) : <span className="text-muted-foreground/60">—</span>}
                        </SelectValue>
                      </SelectTrigger>
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
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 hidden sm:table-cell">
                    <Select value={h.frequency_type} onValueChange={(v: FrequencyType) => {
                      const updates: Partial<Habit> = { frequency_type: v };
                      if (v === "weekdays" && (!h.frequency_days || h.frequency_days.length === 0)) {
                        updates.frequency_days = [1, 2, 3, 4, 5];
                      }
                      updateHabit(h.id, updates);
                    }}>
                      <SelectTrigger className="h-8 text-xs border-none bg-transparent shadow-none focus:ring-0 px-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{FREQ_LABEL.daily}</SelectItem>
                        <SelectItem value="weekdays">{FREQ_LABEL.weekdays}</SelectItem>
                        <SelectItem value="weekly">{FREQ_LABEL.weekly}</SelectItem>
                        <SelectItem value="monthly">{FREQ_LABEL.monthly}</SelectItem>
                      </SelectContent>
                    </Select>
                    {h.frequency_type === "weekdays" && (
                      <div className="flex gap-0.5 mt-1 px-1">
                        {[
                          { i: 1, l: "P" }, { i: 2, l: "S" }, { i: 3, l: "Ç" }, { i: 4, l: "P" },
                          { i: 5, l: "C" }, { i: 6, l: "C" }, { i: 0, l: "P" },
                        ].map((d) => {
                          const sel = (h.frequency_days || []).includes(d.i);
                          return (
                            <button
                              key={d.i}
                              type="button"
                              title={["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"][d.i]}
                              onClick={() => {
                                const cur = new Set(h.frequency_days || []);
                                if (cur.has(d.i)) cur.delete(d.i); else cur.add(d.i);
                                updateHabit(h.id, { frequency_days: Array.from(cur).sort((a, b) => a - b) });
                              }}
                              className={`flex-1 h-5 text-[10px] rounded-sm border transition-colors ${
                                sel ? "bg-accent text-foreground border-accent" : "border-border/60 text-muted-foreground hover:bg-accent/30"
                              }`}
                            >{d.l}</button>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 hidden md:table-cell">
                    <Select value={h.time_of_day} onValueChange={(v: TimeOfDay) => updateHabit(h.id, { time_of_day: v })}>
                      <SelectTrigger className="h-8 text-xs border-none bg-transparent shadow-none focus:ring-0 px-1"><SelectValue>{timeOfDayLabel(h.time_of_day)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Herhangi</SelectItem>
                        {todOptions.map((o) => (
                          <SelectItem key={o.key} value={o.key}>
                            <span className="flex items-center gap-2">
                              <span>{o.label}</span>
                              <span className="text-[10px] text-muted-foreground tracking-wide tabular-nums">{o.range}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 text-right">
                    <button
                      onClick={() => deleteHabit(h.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </div>
      )}

      <HabitDetailDialog
        open={!!openHabit}
        habit={openHabit}
        onClose={() => setOpenHabit(null)}
        onSave={updateHabit}
        onDelete={deleteHabit}
      />

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide text-base">Kategoriler</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <CategoryColorPicker value={c.color} onChange={(k) => updateCategory(c.id, { color: k })} />
                <Input
                  defaultValue={c.name}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.name) updateCategory(c.id, { name: e.target.value.trim() }); }}
                  className="bg-transparent h-8 text-sm flex-1"
                />
                <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) { createCategory(newCatName); setNewCatName(""); } }}
                placeholder="Yeni kategori..."
                className="bg-transparent h-8 text-sm"
              />
              <Button variant="ghost" size="sm" onClick={() => { if (newCatName.trim()) { createCategory(newCatName); setNewCatName(""); } }} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitsBoard;
