import { useState, type ReactNode } from "react";
import { Loader2, MapPin, RotateCcw, Search, Sunrise } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import { useHabitCategories, colorHex } from "@/hooks/useHabitCategories";
import { useUserLocation } from "@/hooks/useUserLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  ALL_TIME_OF_DAY_KEYS,
  DEFAULT_TIME_OF_DAY_LABELS,
  useTimeOfDayRanges,
} from "@/lib/timeOfDay";
import { searchTurkeyCities, TURKEY_CITIES } from "@/lib/turkeyCities";
import { cn } from "@/lib/utils";

const ChoiceButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-9 rounded px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      active ? "bg-white font-medium text-foreground" : "font-light text-muted-foreground hover:text-foreground",
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
  const { categories, loading: categoriesLoading } = useHabitCategories();
  const [citySearch, setCitySearch] = useState("");

  const cityResults = searchTurkeyCities(citySearch).slice(0, 30);
  const enabledCount = ALL_TIME_OF_DAY_KEYS.length - todDisabled.length;

  const updateAutoMode = async (value: boolean) => {
    setTodAutoMode(value);
    await updateUserSettings({ auto_prayer_times: value });
    if (value && !userSettings.city && userSettings.latitude == null) {
      toast("Konum veya şehir seçin.");
    }
  };

  const selectCity = async (name: string, lat: number, lng: number) => {
    await updateUserSettings({
      city: name,
      country: "Turkey",
      latitude: lat,
      longitude: lng,
    });
    setCitySearch("");
    toast.success(`${name} seçildi`);
  };

  const refreshLocation = async () => {
    const pos = await requestGeo();
    if (pos) {
      await updateUserSettings({
        latitude: pos.latitude,
        longitude: pos.longitude,
        location_permission: true,
        city: null,
      });
      toast.success("Konum güncellendi");
      return;
    }
    await updateUserSettings({ location_permission: false });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-4">
          <h2 className="text-base font-medium tracking-normal text-foreground">Bugün varsayılan filtresi</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Alışkanlıklar sayfası açıldığında hangi alışkanlıklar gösterilsin?
          </p>
        </div>

        <div className="inline-flex rounded-md bg-muted/45 p-1">
          <ChoiceButton active={habitDefault === "time"} onClick={() => setHabitDefault("time")}>
            Günün Saati
          </ChoiceButton>
          <ChoiceButton active={habitDefault === "all"} onClick={() => setHabitDefault("all")}>
            Tümü
          </ChoiceButton>
        </div>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
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

        <div className="space-y-2">
          {ALL_TIME_OF_DAY_KEYS.map((key) => {
            const isEnabled = !todDisabled.includes(key);
            const option = todOptions.find((item) => item.key === key);

            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[140px_minmax(0,1fr)_120px_92px_80px] items-center gap-3 rounded-md bg-muted/35 px-3 py-3",
                  !isEnabled && "opacity-55",
                )}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{DEFAULT_TIME_OF_DAY_LABELS[key].label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{isEnabled ? option?.range ?? "—" : "Kapalı"}</div>
                </div>
                <Input
                  value={todLabels[key]}
                  onChange={(event) => renameTod(key, event.target.value)}
                  disabled={!isEnabled}
                  placeholder={DEFAULT_TIME_OF_DAY_LABELS[key].label}
                  className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none"
                />
                <Input
                  type="time"
                  value={todStarts[key]}
                  onChange={(event) => updateTod(key, event.target.value)}
                  disabled={!isEnabled || todAuto}
                  className="h-10 rounded-md border-transparent bg-white/75 text-sm font-light shadow-none"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={isEnabled}
                    disabled={isEnabled && enabledCount <= 1}
                    onCheckedChange={(value) => setTodEnabled(key, value)}
                  />
                  <span>{isEnabled ? "Aktif" : "Pasif"}</span>
                </label>
                <span className="text-xs text-muted-foreground">{todAuto ? "Otomatik" : "Elle"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-5">
          <div className="flex items-start gap-2">
            <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="text-base font-medium tracking-normal text-foreground">Güneşin konumuna göre belirle</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Gün dilimlerinin başlangıç saatlerini şehir veya konuma göre otomatik ayarla.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4 rounded-md bg-muted/35 px-4 py-3">
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

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={geoLoading}
            onClick={() => void refreshLocation()}
            className="h-9 border-0 bg-muted/45 px-3 text-xs hover:bg-muted"
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

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Şehir seç
          </label>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="Şehir ara..."
              className="h-10 rounded-md border-transparent bg-muted/55 pl-9 text-sm font-light shadow-none"
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
                    active ? "bg-accent/60 font-medium text-foreground" : "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
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

      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Alışkanlık kategorileri</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Kategori görünürlüğü ve varsayılan sıralamayı düzenle.
          </p>
        </div>

        {categoriesLoading ? (
          <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
            Kategoriler yükleniyor...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
            Henüz alışkanlık kategorisi yok.
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 rounded-md bg-muted/35 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: colorHex(category.color) }} />
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Aktif</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Kategori arşivleme soft-delete fazında ele alınacak."
                    aria-label="Kategori arşivleme soft-delete fazında ele alınacak."
                    className="h-8 px-2 text-xs text-muted-foreground"
                  >
                    Arşivle
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground/80">
          Kategori arşivleme ve varsayılan sıralama sonraki fazda güvenli şekilde ele alınacak.
        </p>
      </section>
    </div>
  );
};
