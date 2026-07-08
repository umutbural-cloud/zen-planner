import { useState, type ReactNode } from "react";
import { Loader2, MapPin, PencilLine, Plus, RotateCcw, Search, Sunrise } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import { CATEGORY_COLORS, useHabitCategories, colorHex } from "@/hooks/useHabitCategories";
import { useUserLocation } from "@/hooks/useUserLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  ALL_TIME_OF_DAY_KEYS,
  DEFAULT_TIME_OF_DAY_LABELS,
  useTimeOfDayRanges,
} from "@/lib/timeOfDay";
import { normalizeCategoryName } from "@/lib/normalizeCategoryName";
import { searchTurkeyCities, TURKEY_CITIES } from "@/lib/turkeyCities";
import { cn } from "@/lib/utils";

type HabitCategoryDraft = {
  name: string;
  color: string;
};

const ChoiceButton = ({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-9 rounded px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      className,
      active ? "bg-white font-medium text-foreground dark:bg-muted/40" : "font-light text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

export const SettingsHabitsPage = () => {
  const [habitDefault, setHabitDefault] = useHabitTodayDefault();
  const {
    starts: todStarts,
    labels: todLabels,
    disabled: todDisabled,
    options: todOptions,
    auto: todAuto,
    rename: renameTod,
    update: updateTod,
    setEnabled: setTodEnabled,
    reset: resetTod,
    setAutoMode: setTodAutoMode,
  } = useTimeOfDayRanges();
  const { settings: userSettings, update: updateUserSettings } = useUserSettings();
  const { request: requestGeo, loading: geoLoading } = useUserLocation();
  const prayerQuery = usePrayerTimes();
  const { categories, loading: categoriesLoading, createCategory, updateCategory } = useHabitCategories();
  const [citySearch, setCitySearch] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<HabitCategoryDraft>({ name: "", color: "gray" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<HabitCategoryDraft>({ name: "", color: "gray" });

  const cityResults = searchTurkeyCities(citySearch).slice(0, 30);
  const enabledCount = ALL_TIME_OF_DAY_KEYS.length - todDisabled.length;

  const isDuplicateCategoryName = (name: string, excludeId?: string) => {
    const normalized = normalizeCategoryName(name.trim());
    return categories.some((category) =>
      category.id !== excludeId &&
      normalizeCategoryName(category.name) === normalized,
    );
  };

  const updateAutoMode = async (value: boolean) => {
    setTodAutoMode(value);
    const { error } = await updateUserSettings({ auto_prayer_times: value });
    if (error) {
      setTodAutoMode(!value);
      toast.error("Otomatik vakit sistemi güncellenemedi.");
      return;
    }
    if (value && !userSettings.city && userSettings.latitude == null) {
      toast("Konum veya şehir seçin.");
    }
  };

  const selectCity = async (name: string, lat: number, lng: number) => {
    const { error } = await updateUserSettings({
      city: name,
      country: "Turkey",
      latitude: lat,
      longitude: lng,
    });
    if (error) {
      toast.error("Şehir güncellenemedi.");
      return;
    }
    setCitySearch("");
    toast.success(`${name} seçildi`);
  };

  const refreshLocation = async () => {
    const pos = await requestGeo();
    if (pos) {
      const { error } = await updateUserSettings({
        latitude: pos.latitude,
        longitude: pos.longitude,
        location_permission: true,
        city: null,
      });
      if (error) {
        toast.error("Konum güncellenemedi.");
        return;
      }
      toast.success("Konum güncellendi");
      return;
    }
    const { error } = await updateUserSettings({ location_permission: false });
    if (error) toast.error("Konum güncellenemedi.");
  };

  const resetCategoryCreate = () => {
    setIsAddingCategory(false);
    setNewCategory({ name: "", color: "gray" });
  };

  const openCategoryEdit = (id: string, name: string, color: string | null) => {
    setEditingCategoryId(id);
    setEditingCategory({ name, color: color || "gray" });
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategory({ name: "", color: "gray" });
  };

  const saveNewCategory = async () => {
    const trimmed = newCategory.name.trim();
    if (!trimmed) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }
    if (isDuplicateCategoryName(trimmed)) {
      toast.error("Bu kategori zaten var.");
      return;
    }
    const created = await createCategory(trimmed, newCategory.color || "gray");
    if (!created) return;
    toast.success("Kategori eklendi.");
    resetCategoryCreate();
  };

  const saveCategoryEdit = async () => {
    if (!editingCategoryId) return;
    const trimmed = editingCategory.name.trim();
    if (!trimmed) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }
    if (isDuplicateCategoryName(trimmed, editingCategoryId)) {
      toast.error("Bu kategori zaten var.");
      return;
    }
    await updateCategory(editingCategoryId, {
      name: trimmed,
      color: editingCategory.color || "gray",
    });
    toast.success("Kategori güncellendi.");
    cancelCategoryEdit();
  };

  const ColorSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <Select value={value} onValueChange={onChange}>
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

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-4">
          <h2 className="text-base font-medium tracking-normal text-foreground">Bugün varsayılan filtresi</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Alışkanlıklar sayfası açıldığında hangi alışkanlıklar gösterilsin?
          </p>
        </div>

        <div className="flex w-full max-w-full rounded-lg bg-muted/45 p-1 dark:bg-muted/30 md:w-auto md:max-w-none">
          <ChoiceButton active={habitDefault === "time"} onClick={() => setHabitDefault("time")} className="flex-1">
            Günün Saati
          </ChoiceButton>
          <ChoiceButton active={habitDefault === "all"} onClick={() => setHabitDefault("all")} className="flex-1">
            Tümü
          </ChoiceButton>
        </div>
      </section>

      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-5 md:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium tracking-normal text-foreground">Gün dilimleri</h2>
            {todAuto && (
              <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Otomatik
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Alışkanlıklarını günün hangi bölümlerinde takip edeceğini düzenle.
          </p>
        </div>

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="hidden md:block">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium tracking-normal text-foreground">Gün dilimleri</h2>
              {todAuto && (
                <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Otomatik
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Alışkanlıklarını günün hangi bölümlerinde takip edeceğini düzenle.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetTod}
            className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
            Varsayılana dön
          </Button>
        </div>

        <div className="space-y-2 md:space-y-2">
          {ALL_TIME_OF_DAY_KEYS.map((key) => {
            const isEnabled = !todDisabled.includes(key);
            const option = todOptions.find((item) => item.key === key);

            return (
              <div
                key={key}
                className={cn(
                  "relative mx-auto flex w-[296px] max-w-full flex-col items-stretch gap-1 rounded-lg border border-muted/50 bg-muted/25 px-3 py-2 pr-14 md:w-auto md:max-w-none md:grid md:grid-cols-[140px_minmax(0,1fr)_120px_92px_80px] md:items-center md:gap-3 md:rounded-md md:border-0 md:bg-muted/35 md:px-3 md:py-3 md:pr-3",
                  !isEnabled && "opacity-55",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/55 text-muted-foreground">
                    <Sunrise className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{DEFAULT_TIME_OF_DAY_LABELS[key].label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{isEnabled ? option?.range ?? "—" : "Kapalı"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-3">
                  <Input
                    value={todLabels[key]}
                    onChange={(event) => renameTod(key, event.target.value)}
                    disabled={!isEnabled}
                    placeholder={DEFAULT_TIME_OF_DAY_LABELS[key].label}
                    className="h-10 min-w-0 flex-1 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none dark:bg-muted/30"
                  />
                  <Input
                    type="time"
                    value={todStarts[key]}
                    onChange={(event) => updateTod(key, event.target.value)}
                    disabled={!isEnabled || todAuto}
                    className="h-10 w-[104px] rounded-md border-transparent bg-white/75 text-sm font-light shadow-none dark:bg-muted/30 md:w-auto"
                  />
                </div>
                <div className="absolute right-3 top-3 flex items-center md:static md:justify-end md:gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground md:gap-2">
                    <Switch
                      checked={isEnabled}
                      disabled={isEnabled && enabledCount <= 1}
                      onCheckedChange={(value) => setTodEnabled(key, value)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-5 md:hidden">
          <div className="flex items-start gap-2">
            <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="text-base font-medium tracking-normal text-foreground">Güneşin konumuna göre belirle</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Gün dilimlerinin başlangıç saatlerini şehir veya konuma göre otomatik ayarla.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 hidden items-center justify-between gap-4 rounded-md bg-muted/35 px-4 py-3 md:flex">
          <div>
            <div className="text-sm font-medium text-foreground">Otomatik vakit sistemi</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {userSettings.city
                ? userSettings.city
                : userSettings.latitude != null
                  ? `${userSettings.latitude.toFixed(2)}°, ${userSettings.longitude?.toFixed(2)}°`
                  : "Konum belirtilmedi"}
            </div>
          </div>
          <Switch checked={todAuto} onCheckedChange={(value) => void updateAutoMode(value)} />
        </div>

        <div className="mb-4 rounded-lg border border-muted/50 bg-muted/25 px-4 py-4 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">Otomatik vakit sistemi</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {userSettings.city
                  ? userSettings.city
                  : userSettings.latitude != null
                    ? `${userSettings.latitude.toFixed(2)}°, ${userSettings.longitude?.toFixed(2)}°`
                    : "Konum belirtilmedi"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void prayerQuery.refetch()}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                aria-label="Vakitleri yenile"
                title="Vakitleri yenile"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
              </Button>
              <Switch checked={todAuto} onCheckedChange={(value) => void updateAutoMode(value)} />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
              Şehir / konum
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={citySearch}
                onChange={(event) => setCitySearch(event.target.value)}
                placeholder="Şehir ara..."
                className="h-10 rounded-md border-transparent bg-white/75 pl-10 text-sm font-light shadow-none dark:bg-muted/30"
              />
            </div>
          </div>
        </div>

        {prayerQuery.error && (
          <div className="mb-4 rounded-md bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            Vakit bilgisi alınamadı, son kayıtlı veriler kullanılıyor.
          </div>
        )}

        {prayerQuery.data && (
          <div className="mb-4 grid grid-cols-5 gap-3 rounded-md bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
            {ALL_TIME_OF_DAY_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="font-medium text-foreground">{todLabels[key]}</div>
                <div>{prayerQuery.data.starts[key]}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={geoLoading}
            onClick={() => void refreshLocation()}
            className="h-9 border-0 bg-muted/45 px-3 text-xs hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/40"
          >
            {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} />}
            Konumu güncelle
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => prayerQuery.refetch()}
            className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
            Vakitleri yenile
          </Button>
          {prayerQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="hidden md:block">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Şehir seç
          </label>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="Şehir ara..."
              className="h-10 rounded-md border-transparent bg-muted/55 pl-10 text-sm font-light shadow-none dark:bg-muted/30"
            />
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md bg-muted/35">
            {(citySearch ? cityResults : TURKEY_CITIES.slice(0, 20)).map((city) => {
              const active = userSettings.city === city.name;
              return (
                <button
                  key={city.ascii}
                  type="button"
                  onClick={() => void selectCity(city.name, city.lat, city.lng)}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent/60 font-medium text-foreground dark:bg-accent/35"
                      : "text-muted-foreground hover:bg-accent/35 hover:text-foreground dark:hover:bg-accent/30",
                  )}
                >
                  {city.name}
                </button>
              );
            })}
            {citySearch && cityResults.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Sonuç bulunamadı</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white px-4 py-4 dark:bg-card md:px-6 md:py-5">
        <div className="mb-4 md:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-medium tracking-normal text-foreground">Alışkanlık kategorileri</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Alışkanlıklarını gruplamak için kategori adı ve rengini düzenle.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingCategory((current) => !current)}
              className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
              Yeni Kategori
            </Button>
          </div>
        </div>

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-base font-medium tracking-normal text-foreground">Alışkanlık kategorileri</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Alışkanlıklarını gruplamak için kategori adı ve rengini düzenle.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingCategory((current) => !current)}
            className="hidden h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground md:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
            Yeni Kategori
          </Button>
        </div>

        <div className="mb-4 space-y-3 md:hidden">
          {isAddingCategory && (
            <div className="space-y-3 rounded-lg border border-muted/50 bg-muted/25 px-3 py-3">
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
                <Button type="button" size="sm" onClick={() => void saveNewCategory()} className="h-9 px-3 text-xs">
                  Kaydet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetCategoryCreate}
                  className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}

          {editingCategoryId && (
            <div className="space-y-3 rounded-lg border border-muted/50 bg-muted/25 px-3 py-3">
              <Input
                value={editingCategory.name}
                onChange={(event) => setEditingCategory((current) => ({ ...current, name: event.target.value }))}
                placeholder="Kategori adı"
                className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none dark:bg-muted/30"
              />
              <ColorSelect
                value={editingCategory.color}
                onChange={(value) => setEditingCategory((current) => ({ ...current, color: value }))}
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => void saveCategoryEdit()} className="h-9 px-3 text-xs">
                  Kaydet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelCategoryEdit}
                  className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}
        </div>

        {isAddingCategory && (
          <div className="mb-4 hidden grid-cols-[minmax(0,1fr)_220px_120px] gap-3 rounded-md bg-muted/35 px-3 py-3 md:grid md:grid-cols-[minmax(0,1fr)_220px_120px]">
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
              <Button type="button" size="sm" onClick={() => void saveNewCategory()} className="h-9 px-3 text-xs">
                Kaydet
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCategoryCreate}
                className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}

        {categoriesLoading ? (
          <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
            Kategoriler yükleniyor...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
            Henüz alışkanlık kategorisi yok.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 md:hidden">
              {categories.map((category) => {
                const isEditing = editingCategoryId === category.id;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-muted/50 bg-muted/25 pl-3 pr-2 py-2",
                      isEditing && "ring-1 ring-ring",
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorHex(category.color) }} />
                    <span className="max-w-[9rem] truncate text-sm font-medium text-foreground">{category.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Kategoriyi düzenle"
                      title="Kategoriyi düzenle"
                      onClick={() => openCategoryEdit(category.id, category.name, category.color)}
                      className="h-7 w-7 shrink-0 rounded-full bg-transparent p-0 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    >
                      <PencilLine className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setIsAddingCategory((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-muted-foreground/30 bg-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
                Yeni Kategori
              </button>
            </div>

          <div className="hidden md:block md:space-y-2">
            {categories.map((category) => {
              const isEditing = editingCategoryId === category.id;
              return (
                <div
                  key={category.id}
                  className="rounded-lg border border-muted/50 bg-muted/25 px-3 py-3 md:grid md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center md:gap-3 md:rounded-md md:border-0 md:bg-muted/35 md:px-4 md:py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorHex(category.color) }} />
                    <div className="min-w-0">
                      {isEditing ? (
                        <Input
                          value={editingCategory.name}
                          onChange={(event) => setEditingCategory((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Kategori adı"
                          className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none dark:bg-muted/30"
                        />
                      ) : (
                        <span className="block truncate text-sm font-medium text-foreground">{category.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {isEditing ? (
                      <ColorSelect
                        value={editingCategory.color}
                        onChange={(value) => setEditingCategory((current) => ({ ...current, color: value }))}
                      />
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" size="sm" onClick={() => void saveCategoryEdit()} className="h-8 px-2 text-xs">
                        Kaydet
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelCategoryEdit}
                        className="h-8 px-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      >
                        Vazgeç
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Kategoriyi düzenle"
                        title="Kategoriyi düzenle"
                        onClick={() => openCategoryEdit(category.id, category.name, category.color)}
                        className="h-8 w-8 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      >
                        <PencilLine className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}

        <p className="mt-4 text-xs text-muted-foreground/80">
          Kategori silme/arşivleme sonraki güvenli fazda ele alınacak.
        </p>
      </section>
    </div>
  );
};
