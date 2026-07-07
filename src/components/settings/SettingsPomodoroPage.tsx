import { useEffect, useState } from "react";
import { Plus, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { usePomodoroCategories, type PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { normalizeCategoryName } from "@/lib/normalizeCategoryName";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [
  { label: "25 / 5", work: 25, rest: 5, active: true },
  { label: "50 / 10", work: 50, rest: 10 },
  { label: "90 / 15", work: 90, rest: 15 },
  { label: "Özel", work: 25, rest: 5 },
];

type CategoryDraft = {
  name: string;
  color: string;
};

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
    <SelectTrigger className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none">
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

export const SettingsPomodoroPage = () => {
  const { categories, loading, create, update } = usePomodoroCategories();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>({ name: "", color: "gray" });
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryDraft>({ name: "", color: "gray" });

  const editingCategory = categories.find((category) => category.id === editingCategoryId) ?? null;

  useEffect(() => {
    if (!editingCategory) return;
    setDraft({ name: editingCategory.name, color: editingCategory.color || "gray" });
  }, [editingCategory]);

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
      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Varsayılan süreler</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Yeni bir odak oturumu başlattığında kullanılacak çalışma ve dinlenme sürelerini belirle.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled
              className={cn(
                "h-9 rounded-md px-3 text-sm transition-colors",
                preset.active ? "bg-accent text-foreground font-medium" : "bg-muted/45 text-muted-foreground",
                "cursor-not-allowed opacity-80",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Çalışma süresi</span>
            <Input
              value="25 dakika"
              disabled
              className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Dinlenme süresi</span>
            <Input
              value="5 dakika"
              disabled
              className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none"
            />
          </label>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/80">
          Kalıcı varsayılan süre ayarı Supabase migration sonrası aktifleşecek.
        </p>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
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
              className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none"
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

        <div className="grid grid-cols-[minmax(0,1fr)_160px_90px_180px] gap-4 px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          <span>Kategori</span>
          <span>Renk</span>
          <span>Durum</span>
          <span>Aksiyonlar</span>
        </div>

        <div className="divide-y divide-muted/70">
          {loading ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Kategoriler yükleniyor...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Henüz çalışma kategorisi yok.
            </div>
          ) : (
            categories.map((category) => {
              const editing = editingCategoryId === category.id;
              return (
                <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_160px_90px_180px] items-center gap-4 px-3 py-4">
                  <div className="min-w-0">
                    {editing ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Kategori adı"
                        className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none"
                      />
                    ) : (
                      <span className="block truncate text-sm font-medium text-foreground">{category.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: colorHex(editing ? draft.color : category.color) }} />
                    {editing ? (
                      <ColorSelect value={draft.color} onChange={(value) => setDraft((current) => ({ ...current, color: value }))} />
                    ) : (
                      <span className="text-sm font-light text-muted-foreground">
                        {CATEGORY_COLORS.find((color) => color.key === category.color)?.label ?? category.color}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-light text-muted-foreground">Aktif</span>

                  <div className="flex items-center gap-2">
                    {editing ? (
                      <>
                        <Button type="button" size="sm" onClick={() => void saveCategory()} className="h-8 px-2 text-xs">
                          Kaydet
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategoryId(null)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        >
                          Vazgeç
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(category)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        >
                          <PencilLine className="h-3.5 w-3.5" strokeWidth={1.7} />
                          Düzenle
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Kategori arşivleme soft-delete migration sonrası aktifleşecek."
                          aria-label="Kategori arşivleme soft-delete migration sonrası aktifleşecek."
                          className="h-8 px-2 text-xs text-muted-foreground"
                        >
                          Arşivle
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground/80">
          Kategoriler kalıcı silinmez; kullanılmayan kategoriler arşivlenir. Geçmiş oturum verileri korunur. Arşivleme davranışı ayrı DB fazında aktifleşecek.
        </p>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
        <h2 className="text-base font-medium tracking-normal text-foreground">Oturum davranışı</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Otomatik dinlenmeye geçme, oturum bitince bildirim gönderme ve oturum sonunda not isteme seçenekleri sonraki fazda yönetilecek.
        </p>
      </section>
    </div>
  );
};
