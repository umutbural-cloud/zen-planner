import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { useProjects } from "@/hooks/useProjects";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DEFAULT_HOME_FOCUS_OPTIONS, type DailyFocusOption } from "@/features/home/types";
import { cn } from "@/lib/utils";

type FocusDrafts = Record<string, string>;

const createFocusId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeFocusList = (options: DailyFocusOption[]) =>
  options.map((option) => ({
    ...option,
    label: option.label.trim(),
    color: option.color || "stone",
  })).filter((option) => option.label.length > 0);

export const SettingsHomePage = () => {
  const { settings, update: updateUserSettings } = useUserSettings();
  const { projects } = useProjects();
  const focusOptions = settings.home_focus_options?.length ? settings.home_focus_options : DEFAULT_HOME_FOCUS_OPTIONS;
  const [focusDrafts, setFocusDrafts] = useState<FocusDrafts>({});
  const [selectedProjectsModeOpen, setSelectedProjectsModeOpen] = useState(false);

  const workspaceProjects = useMemo(
    () => projects.filter((project) => project.kind === "project"),
    [projects],
  );
  const selectedProjectIds = useMemo(() => settings.home_task_project_ids ?? [], [settings.home_task_project_ids]);
  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const allProjectsMode = selectedProjectIds.length === 0;
  const showSelectedProjectsMode = selectedProjectsModeOpen || !allProjectsMode;

  useEffect(() => {
    setFocusDrafts(Object.fromEntries(focusOptions.map((option) => [option.id, option.label])));
  }, [focusOptions]);

  const persistFocusOptions = async (next: DailyFocusOption[]) => {
    const normalized = normalizeFocusList(next);
    if (normalized.length === 0) {
      toast.error("En az bir odak seçeneği kalmalı.");
      return;
    }
    const { error } = await updateUserSettings({ home_focus_options: normalized });
    if (error) toast.error("Günün Odağı güncellenemedi.");
  };

  const updateFocusOption = (index: number, patch: Partial<DailyFocusOption>) => {
    const next = focusOptions.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option);
    void persistFocusOptions(next);
  };

  const commitFocusLabel = (index: number) => {
    const option = focusOptions[index];
    const nextLabel = (focusDrafts[option.id] ?? "").trim();
    if (!nextLabel) {
      toast.error("Odak adı boş olamaz.");
      setFocusDrafts((prev) => ({ ...prev, [option.id]: option.label }));
      return;
    }
    if (nextLabel === option.label) return;
    updateFocusOption(index, { label: nextLabel });
  };

  const addFocusOption = () => {
    void persistFocusOptions([
      ...focusOptions,
      { id: createFocusId(), label: "Yeni Odak", color: "stone" },
    ]);
  };

  const removeFocusOption = (index: number) => {
    if (focusOptions.length <= 1) return;
    void persistFocusOptions(focusOptions.filter((_, optionIndex) => optionIndex !== index));
  };

  const resetFocusOptions = () => {
    void persistFocusOptions(DEFAULT_HOME_FOCUS_OPTIONS);
  };

  const updateHomeTaskProjects = async (projectIds: string[] | null) => {
    if (!projectIds || projectIds.length === 0) setSelectedProjectsModeOpen(false);
    const { error } = await updateUserSettings({
      home_task_project_ids: projectIds && projectIds.length > 0 ? Array.from(new Set(projectIds)) : null,
    });
    if (error) toast.error("Ana sayfa görev kaynakları güncellenemedi.");
  };

  const toggleProject = (projectId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedProjectIds, projectId]))
      : selectedProjectIds.filter((id) => id !== projectId);
    if (next.length > 0) setSelectedProjectsModeOpen(true);
    void updateHomeTaskProjects(next.length > 0 ? next : null);
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-medium tracking-normal text-foreground">Günün Odağı</h2>
            <p className="mt-1 max-w-2xl text-[1rem] leading-6 text-muted-foreground md:text-sm">
              Ana sayfadaki odak seçiminde görünen seçenekleri düzenle.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFocusOptions}
              className="h-10 w-full px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground sm:w-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
              Varsayılana dön
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFocusOption}
              className="h-10 w-full px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
              Odak ekle
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {focusOptions.map((option, index) => (
            <div key={option.id} className="rounded-lg bg-muted/35 p-3 md:rounded-md md:px-3 md:py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_44px_44px] items-center gap-2 md:hidden">
                <div className="relative min-w-0">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                    style={{ background: colorHex(option.color || "stone") }}
                  />
                  <Input
                    value={focusDrafts[option.id] ?? option.label}
                    onChange={(event) => setFocusDrafts((prev) => ({ ...prev, [option.id]: event.target.value }))}
                    onBlur={() => commitFocusLabel(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    placeholder="Odak adı"
                    className="h-11 w-full min-w-0 rounded-md border-transparent bg-white/75 pl-8 text-xs font-light shadow-none dark:bg-muted/30"
                    aria-label="Odak adı"
                  />
                </div>
                <Select
                  value={option.color || "stone"}
                  onValueChange={(color) => updateFocusOption(index, { color })}
                >
                  <SelectTrigger
                    aria-label="Odak rengini değiştir"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-transparent bg-white/75 p-0 text-muted-foreground shadow-none dark:bg-muted/30 [&>svg]:hidden"
                  >
                    <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                    <span className="sr-only">Odak rengini değiştir</span>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFocusOption(index)}
                  disabled={focusOptions.length <= 1}
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-accent/50 hover:text-destructive disabled:hover:text-muted-foreground"
                  aria-label="Odak seçeneğini sil"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                </Button>
              </div>

              <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_180px_40px]">
                <Input
                  value={focusDrafts[option.id] ?? option.label}
                  onChange={(event) => setFocusDrafts((prev) => ({ ...prev, [option.id]: event.target.value }))}
                  onBlur={() => commitFocusLabel(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  placeholder="Odak adı"
                  className="h-11 rounded-md border-transparent bg-white/75 text-[1rem] font-light shadow-none dark:bg-muted/30 md:h-10 md:text-sm"
                  aria-label="Odak adı"
                />
                <Select
                  value={option.color || "stone"}
                  onValueChange={(color) => updateFocusOption(index, { color })}
                >
                  <SelectTrigger className="h-11 rounded-md border-transparent bg-white/75 text-[1rem] font-light shadow-none dark:bg-muted/30 md:h-10 md:text-sm">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFocusOption(index)}
                  disabled={focusOptions.length <= 1}
                  className="h-9 w-9 text-muted-foreground hover:bg-accent/50 hover:text-destructive disabled:hover:text-muted-foreground"
                  aria-label="Odak seçeneğini sil"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Ana sayfada gösterilecek projeler</h2>
          <p className="mt-1 max-w-2xl text-[1rem] leading-6 text-muted-foreground md:text-sm">
            Ana sayfadaki görev ve yapılıyor alanları hangi projelerden beslensin?
          </p>
        </div>

        <div className="mb-4 grid w-full grid-cols-2 gap-1 rounded-lg bg-muted/45 p-1 dark:bg-muted/30 md:inline-flex md:w-auto md:rounded-md">
          <button
            type="button"
            onClick={() => void updateHomeTaskProjects(null)}
            className={cn(
              "h-10 min-w-0 rounded-md px-2 text-[0.8rem] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:h-9 md:px-3 md:text-sm",
              allProjectsMode
                ? "bg-white font-medium text-foreground dark:bg-muted/40"
                : "font-light text-muted-foreground hover:text-foreground",
            )}
          >
            Tüm projeler
          </button>
          <button
            type="button"
            onClick={() => setSelectedProjectsModeOpen(true)}
            className={cn(
              "h-10 min-w-0 rounded-md px-2 text-[0.8rem] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:h-9 md:px-3 md:text-sm",
              showSelectedProjectsMode
                ? "bg-white font-medium text-foreground dark:bg-muted/40"
                : "font-light text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="md:hidden">Seçili projeler</span>
            <span className="hidden md:inline">Sadece seçili projeler</span>
          </button>
        </div>

        <div className="divide-y divide-muted/70">
          {workspaceProjects.length === 0 ? (
            <div className="rounded-lg bg-muted/35 px-4 py-5 text-center text-[1rem] text-muted-foreground md:rounded-md md:text-sm">
              Gösterilecek proje yok.
            </div>
          ) : (
            workspaceProjects.map((project) => {
              const checked = showSelectedProjectsMode && selectedProjectSet.has(project.id);
              return (
                <label
                  key={project.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-[1rem] transition-colors hover:bg-muted/30 md:min-h-0 md:rounded-none md:px-1 md:py-3 md:text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => toggleProject(project.id, nextChecked === true)}
                    className="shrink-0"
                  />
                  <span className="shrink-0 text-base">{project.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-light text-foreground">{project.name}</span>
                </label>
              );
            })
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground/80">
          Hiç seçim yapılmazsa tüm projeler gösterilir.
        </p>
      </section>

      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <h2 className="text-base font-medium tracking-normal text-foreground">Ana sayfa bölümleri</h2>
        <p className="mt-2 max-w-2xl text-[1rem] leading-6 text-muted-foreground md:text-sm">
          Günün Odağı, Pomodoro özeti, alışkanlık özeti ve çalışma geçmişi gibi alanların görünürlüğü sonraki fazda yönetilecek.
        </p>
      </section>
    </div>
  );
};
