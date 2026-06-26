import { useState } from "react";
import { Plus, Trash2, GripVertical, Settings2, X } from "lucide-react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

type SortableHabitRowProps = {
  habit: Habit;
  category: ReturnType<typeof useHabitCategories>["categories"][number] | undefined;
  categories: ReturnType<typeof useHabitCategories>["categories"];
  todOptions: ReturnType<typeof useTimeOfDayRanges>["options"];
  onOpen: (habit: Habit) => void;
  onUpdate: (id: string, updates: Partial<Habit>) => void;
  onDelete: (id: string) => void;
};

const SortableHabitRow = ({
  habit,
  category,
  categories,
  todOptions,
  onOpen,
  onUpdate,
  onDelete,
}: SortableHabitRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={`group ${isDragging ? "relative z-10 bg-card/40" : ""}`}>
      <TableCell className="w-10 px-1 py-1" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="inline-flex h-7 w-7 touch-none cursor-grab items-center justify-center rounded-sm text-muted-foreground/40 transition-colors hover:bg-card/40 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Alışkanlığı sırala"
          title="Sürükle"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </TableCell>
      <TableCell className="px-1 py-1 sm:px-2">
        <HabitIconPicker value={habit.icon} onChange={(value) => onUpdate(habit.id, { icon: value })} />
      </TableCell>
      <TableCell className="px-1 py-1 sm:px-2">
        <button
          type="button"
          onClick={() => onOpen(habit)}
          className="w-full text-left text-sm font-light hover:underline"
        >
          {habit.title}
        </button>
      </TableCell>
      <TableCell className="hidden px-1 py-1 sm:table-cell sm:px-2">
        <Select
          value={habit.category_id ?? "__none__"}
          onValueChange={(value) => onUpdate(habit.id, { category_id: value === "__none__" ? null : value })}
        >
          <SelectTrigger className="h-8 border-none bg-transparent px-1 text-xs shadow-none focus:ring-0">
            <SelectValue>
              {category ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: colorHex(category.color) }} />
                  {category.name}
                </span>
              ) : <span className="text-muted-foreground/60">—</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: colorHex(item.color) }} />
                  {item.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="hidden px-1 py-1 sm:table-cell sm:px-2">
        <Select value={habit.frequency_type} onValueChange={(value: FrequencyType) => {
          const updates: Partial<Habit> = { frequency_type: value };
          if (value === "weekdays" && (!habit.frequency_days || habit.frequency_days.length === 0)) {
            updates.frequency_days = [1, 2, 3, 4, 5];
          }
          onUpdate(habit.id, updates);
        }}>
          <SelectTrigger className="h-8 border-none bg-transparent px-1 text-xs shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{FREQ_LABEL.daily}</SelectItem>
            <SelectItem value="weekdays">{FREQ_LABEL.weekdays}</SelectItem>
            <SelectItem value="weekly">{FREQ_LABEL.weekly}</SelectItem>
            <SelectItem value="monthly">{FREQ_LABEL.monthly}</SelectItem>
          </SelectContent>
        </Select>
        {habit.frequency_type === "weekdays" && (
          <div className="mt-1 flex gap-0.5 px-1">
            {[
              { i: 1, l: "P" }, { i: 2, l: "S" }, { i: 3, l: "Ç" }, { i: 4, l: "P" },
              { i: 5, l: "C" }, { i: 6, l: "C" }, { i: 0, l: "P" },
            ].map((day) => {
              const selected = (habit.frequency_days || []).includes(day.i);
              return (
                <button
                  key={day.i}
                  type="button"
                  title={["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][day.i]}
                  onClick={() => {
                    const current = new Set(habit.frequency_days || []);
                    if (current.has(day.i)) current.delete(day.i);
                    else current.add(day.i);
                    onUpdate(habit.id, { frequency_days: Array.from(current).sort((a, b) => a - b) });
                  }}
                  className={`h-5 flex-1 rounded-sm border text-[10px] transition-colors ${
                    selected ? "border-accent bg-accent text-foreground" : "border-border/60 text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  {day.l}
                </button>
              );
            })}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden px-1 py-1 md:table-cell sm:px-2">
        <Select value={habit.time_of_day} onValueChange={(value: TimeOfDay) => onUpdate(habit.id, { time_of_day: value })}>
          <SelectTrigger className="h-8 border-none bg-transparent px-1 text-xs shadow-none focus:ring-0">
            <SelectValue>{timeOfDayLabel(habit.time_of_day)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Herhangi</SelectItem>
            {todOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                <span className="flex items-center gap-2">
                  <span>{option.label}</span>
                  <span className="tabular-nums text-[10px] tracking-wide text-muted-foreground">{option.range}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-1 py-1 text-right sm:px-2">
        <button
          type="button"
          onClick={() => onDelete(habit.id)}
          className="p-1 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </TableCell>
    </TableRow>
  );
};

const HabitsBoard = () => {
  const { habits, loading, createHabit, updateHabit, deleteHabit, reorderHabits } = useHabits();
  const { options: todOptions } = useTimeOfDayRanges();
  const { categories, createCategory, updateCategory, deleteCategory } = useHabitCategories();
  const [newTitle, setNewTitle] = useState("");
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sorted = [...habits].sort((a, b) => a.position - b.position);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createHabit({ title: newTitle.trim() });
    setNewTitle("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((habit) => habit.id === active.id);
    const newIndex = sorted.findIndex((habit) => habit.id === over.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const next = arrayMove(sorted, oldIndex, newIndex);
    void reorderHabits(next.map((habit) => habit.id));
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-xs font-light tracking-wide">Alışkanlık</TableHead>
                  <TableHead className="hidden w-32 text-xs font-light tracking-wide sm:table-cell">Kategori</TableHead>
                  <TableHead className="hidden w-40 text-xs font-light tracking-wide sm:table-cell">Sıklık</TableHead>
                  <TableHead className="hidden w-44 text-xs font-light tracking-wide md:table-cell">Günün Dilimi</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext items={sorted.map((habit) => habit.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {sorted.map((habit) => (
                    <SortableHabitRow
                      key={habit.id}
                      habit={habit}
                      category={categories.find((category) => category.id === habit.category_id)}
                      categories={categories}
                      todOptions={todOptions}
                      onOpen={setOpenHabit}
                      onUpdate={updateHabit}
                      onDelete={deleteHabit}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
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
