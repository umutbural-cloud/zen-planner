import { useEffect, useState } from "react";
import { PencilLine, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { usePomodoro } from "@/hooks/usePomodoro";
import { usePomodoroCategories, type PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { useUserSettings } from "@/hooks/useUserSettings";
import { normalizeCategoryName } from "@/lib/normalizeCategoryName";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [
  { label: "25/5", work: 25, rest: 5 },
  { label: "50/10", work: 50, rest: 10 },
  { label: "90/15", work: 90, rest: 15 },
];

const MIN_WORK_MINUTES = 1;
const MAX_WORK_MINUTES = 180;
const MIN_BREAK_MINUTES = 1;
const MAX_BREAK_MINUTES = 60;

type CategoryDraft = {
  name: string;
  color: string;
};

const CATEGORY_COLOR_KEYS = CATEGORY_COLORS.map((color) => color.key);

const ColorSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none dark:bg-muted/30">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {CATEGORY_COLORS.map((color) => (
        <SelectItem key={color.key} value={color.key}>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(color.key) }} />
            {color.label}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const ColorSwatchPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="grid grid-cols-6 gap-2">
    {CATEGORY_COLOR_KEYS.map((key) => {
      const selected = value === key;
      return (
        <button
          key={key}
          type="button"
          aria-label={CATEGORY_COLORS.find((color) => color.key === key)?.label ?? key}
          aria-pressed={selected}
          onClick={() => onChange(key)}
          className={cn(
            "flex h-9 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            selected ? "border-foreground/40 ring-1 ring-foreground/20" : "border-transparent",
          )}
        >
          <span className="h-4 w-4 rounded-full" style={{ background: colorHex(key) }} />
        </button>
      );
    })}
  </div>
);

export const SettingsPomodoroPage = () => {
  const { categories, loading, create, update, remove } = usePomodoroCategories();
  const { settings, update: updateUserSettings } = useUserSettings();
  const { refreshDefaultDurations } = usePomodoro();
  const [durationDraft, setDurationDraft] = useState({
    work: settings.default_pomodoro_work_minutes,
    rest: settings.default_pomodoro_break_minutes,
  });
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [savingDurations, setSavingDurations] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>({ name: "", color: "gray" });
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryDraft>({ name: "", color: "gray" });

  const editingCategory = categories.find((category) => category.id === editingCategoryId) ?? null;
  const activePreset = DURATION_PRESETS.find((preset) => preset.work === durationDraft.work && preset.rest === durationDraft.rest);
  const durationChanged = durationDraft.work !== settings.default_pomodoro_work_minutes ||
    durationDraft.rest !== settings.default_pomodoro_break_minutes;

  useEffect(() => {
    if (!editingCategory) return;
    setDraft({ name: editingCategory.name, color: editingCategory.color || "gray" });
  }, [editingCategory]);

  useEffect(() => {
    const next = {
      work: settings.default_pomodoro_work_minutes,
      rest: settings.default_pomodoro_break_minutes,
    };
    setDurationDraft(next);
    setDurationMode(DURATION_PRESETS.some((preset) => preset.work === next.work && preset.rest === next.rest) ? "preset" : "custom");
  }, [settings.default_pomodoro_break_minutes, settings.default_pomodoro_work_minutes]);

  const updateDurationDraft = (key: "work" | "rest", value: string) => {
    const numeric = Number(value);
    setDurationMode("custom");
    setDurationDraft((current) => ({
      ...current,
      [key]: Number.isFinite(numeric) ? Math.round(numeric) : current[key],
    }));
  };

  const saveDefaultDurations = async () => {
    const work = Math.round(durationDraft.work);
    const rest = Math.round(durationDraft.rest);
    if (work < MIN_WORK_MINUTES || work > MAX_WORK_MINUTES) {
      toast.error("Çalışma süresi 1 ile 180 dakika arasında olmalıdır.");
      return;
    }
    if (rest < MIN_BREAK_MINUTES || rest > MAX_BREAK_MINUTES) {
      toast.error("Dinlenme süresi 1 ile 60 dakika arasında olmalıdır.");
      return;
    }

    try {
      setSavingDurations(true);
      const { error } = await updateUserSettings({
        default_pomodoro_work_minutes: work,
        default_pomodoro_break_minutes: rest,
      });
      if (error) {
        toast.error("Varsayılan süreler güncellenemedi.");
        return;
      }

      await refreshDefaultDurations();
      toast.success("Varsayılan Pomodoro süreleri güncellendi.");
    } catch {
      toast.error("Varsayılan süreler güncellenemedi.");
    } finally {
      setSavingDurations(false);
    }
  };

  const openEdit = (category: PomodoroCategory) => {
    setEditingCategoryId(category.id);
    setDraft({ name: category.name, color: category.color || "gray" });
  };

  const saveCategory = async () => {
    if (!editingCategory) return;
    const trimmed = draft.name.trim();
    if (!trimmed) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }
    const normalized = normalizeCategoryName(trimmed);
    if (categories.some((category) => category.id !== editingCategory.id && normalizeCategoryName(category.name) === normalized)) {
      toast.error("Bu kategori zaten var.");
      return;
    }
    await update(editingCategory.id, { name: trimmed, color: draft.color });
    setEditingCategoryId(null);
  };

  const createCategory = async () => {
    const trimmed = newCategory.name.trim();
    if (!trimmed) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }
    const normalized = normalizeCategoryName(trimmed);
    if (categories.some((category) => normalizeCategoryName(category.name) === normalized)) {
      toast.error("Bu kategori zaten var.");
      return;
    }
    await create(trimmed, newCategory.color);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Varsayılan süreler</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Yeni bir odak oturumu başlattığında kullanılacak çalışma ve dinlenme sürelerini belirle.
          </p>
        </div>

        <div className="mb-4 hidden flex-wrap gap-2 md:flex">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setDurationMode("preset");
                setDurationDraft({ work: preset.work, rest: preset.rest });
              }}
              className={cn(
                "h-9 rounded-md px-3 text-sm transition-colors",
                durationMode === "preset" && activePreset?.label === preset.label
                  ? "bg-accent font-medium text-foreground dark:bg-accent/35"
                  : "bg-muted/45 text-muted-foreground dark:bg-muted/30",
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setDurationMode("custom");
            }}
            className={cn(
              "h-9 rounded-md px-3 text-sm transition-colors",
              durationMode === "custom" || !activePreset
                ? "bg-accent font-medium text-foreground dark:bg-accent/35"
                : "bg-muted/45 text-muted-foreground dark:bg-muted/30",
            )}
          >
            Özel
          </button>
        </div>

        <div className="-mx-6 mb-4 flex gap-2 overflow-x-auto px-6 pb-2 md:hidden">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setDurationMode("preset");
                setDurationDraft({ work: preset.work, rest: preset.rest });
              }}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                durationMode === "preset" && activePreset?.label === preset.label
                  ? "bg-accent font-medium text-foreground dark:bg-accent/35"
                  : "bg-muted/45 text-muted-foreground dark:bg-muted/30",
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setDurationMode("custom");
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              durationMode === "custom" || !activePreset
                ? "bg-accent font-medium text-foreground dark:bg-accent/35"
                : "bg-muted/45 text-muted-foreground dark:bg-muted/30",
            )}
          >
            Özel
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70 md:text-xs">Çalışma</span>
            <Input
              type="number"
              min={MIN_WORK_MINUTES}
              max={MAX_WORK_MINUTES}
              value={durationDraft.work}
              onChange={(event) => updateDurationDraft("work", event.target.value)}
              className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none dark:bg-muted/30"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70 md:text-xs">Dinlenme</span>
            <Input
              type="number"
              min={MIN_BREAK_MINUTES}
              max={MAX_BREAK_MINUTES}
              value={durationDraft.rest}
              onChange={(event) => updateDurationDraft("rest", event.target.value)}
              className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none dark:bg-muted/30"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs leading-5 text-muted-foreground/80">
            Bu ayar yeni/resetlenen Pomodoro oturumlarında uygulanır. Devam eden oturumlar etkilenmez.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void saveDefaultDurations()}
            disabled={savingDurations || !durationChanged}
            className="h-9 px-3 text-xs"
          >
            Varsayılanları Kaydet
          </Button>
        </div>
      </section>

      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-medium tracking-normal text-foreground">Çalışma kategorileri</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Odak oturumlarını hangi çalışma türüne ait olduğunu seçerek kaydet.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding((current) => !current)}
            className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
            Yeni Kategori
          </Button>
        </div>

        {isAdding && (
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_220px_120px] gap-3 rounded-md bg-muted/35 px-3 py-3">
            <Input
              value={newCategory.name}
              onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
              placeholder="Kategori adı"
              className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none dark:bg-muted/30"
            />
            <ColorSelect
              value={newCategory.color}
              onChange={(value) => setNewCategory((current) => ({ ...current, color: value }))}
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => void createCategory()} className="h-9 px-3 text-xs">
                Kaydet
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategory({ name: "", color: "gray" });
                }}
                className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}

        <div className="hidden grid-cols-[minmax(0,1fr)_160px_90px_180px] gap-4 px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 md:grid">
          <span>Kategori</span>
          <span>Renk</span>
          <span>Durum</span>
          <span>Aksiyonlar</span>
        </div>

        <div className="space-y-2 md:divide-y md:divide-muted/70 md:space-y-0">
          {loading ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Kategoriler yükleniyor...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Henüz çalışma kategorisi yok.
            </div>
          ) : (
            categories.map((category) => (
                <div
                  key={category.id}
                  className="relative rounded-lg border border-muted/50 bg-muted/25 px-3 py-3 pr-16 md:grid md:grid-cols-[minmax(0,1fr)_160px_90px_180px] md:items-center md:gap-4 md:rounded-none md:border-0 md:bg-transparent md:px-3 md:py-4 md:pr-3"
                >
                  <div className="flex min-w-0 items-center gap-3 md:block">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorHex(category.color) }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground md:block">
                      {category.name}
                    </span>
                  </div>

                  <div className="hidden md:flex md:items-center md:gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: colorHex(category.color) }} />
                    <span className="truncate text-sm text-muted-foreground">
                      {CATEGORY_COLORS.find((color) => color.key === category.color)?.label ?? category.color}
                    </span>
                  </div>

                  <span className="hidden text-sm font-light text-muted-foreground md:inline-flex">Aktif</span>

                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 md:static md:ml-auto md:gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(category)}
                      aria-label="Kategoriyi düzenle"
                      title="Kategoriyi düzenle"
                      className="h-7 w-7 min-h-0 shrink-0 rounded-md bg-transparent p-0 text-muted-foreground hover:bg-accent/50 hover:text-foreground md:h-8 md:w-8"
                    >
                      <PencilLine className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(category.id)}
                      aria-label="Kategoriyi sil"
                      title="Kategoriyi sil"
                      className="h-7 w-7 min-h-0 shrink-0 rounded-md bg-transparent p-0 text-muted-foreground hover:bg-accent/50 hover:text-destructive md:h-8 md:w-8"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Kategori arşivleme soft-delete migration sonrası aktifleşecek."
                      aria-label="Kategori arşivleme soft-delete migration sonrası aktifleşecek."
                      className="hidden h-8 px-2 text-xs text-muted-foreground md:inline-flex"
                    >
                      Arşivle
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground/80">
          Kategoriler kalıcı silinmez; kullanılmayan kategoriler arşivlenir. Geçmiş oturum verileri korunur. Arşivleme davranışı ayrı DB fazında aktifleşecek.
        </p>
      </section>

      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <h2 className="text-base font-medium tracking-normal text-foreground">Oturum davranışı</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Otomatik dinlenmeye geçme, oturum bitince bildirim gönderme ve oturum sonunda not isteme seçenekleri sonraki fazda yönetilecek.
        </p>
      </section>

      <Sheet open={Boolean(editingCategory)} onOpenChange={(open) => !open && setEditingCategoryId(null)}>
        <SheetContent
          side="bottom"
          className="w-full max-w-none rounded-t-2xl border-t border-border/60 p-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-0 shadow-[0_-12px_32px_rgba(0,0,0,0.18)] md:left-1/2 md:top-1/2 md:h-auto md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:pb-6 md:pt-0"
        >
          <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-left md:px-6">
            <SheetTitle className="text-base font-medium tracking-normal text-foreground md:text-lg">Kategoriyi Düzenle</SheetTitle>
            <SheetDescription className="mt-1 text-xs leading-5 text-muted-foreground">
              Kategori adı ve rengini güncelle.
            </SheetDescription>
          </SheetHeader>

          {editingCategory && (
            <div className="space-y-4 px-4 pt-4 md:px-6">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Kategori adı</span>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Kategori adı"
                  className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none dark:bg-muted/30"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Renk</span>
                <ColorSwatchPicker
                  value={draft.color}
                  onChange={(value) => setDraft((current) => ({ ...current, color: value }))}
                />
              </div>

              <div className="pt-1">
                <Button type="button" onClick={() => void saveCategory()} className="h-10 w-full px-3 text-sm">
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
