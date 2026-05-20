import { useEffect, useState, useMemo } from "react";
import { Moon, Sun, Bell, BellOff, Sprout, LayoutGrid, User, SlidersHorizontal, Trash2, RotateCcw, Plus, Sunrise, MapPin, Search, Loader2, X, Home } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import {
  useTimeOfDayRanges,
  DEFAULT_TIME_OF_DAY_LABELS,
  ALL_TIME_OF_DAY_KEYS,
  type TimeOfDayKey,
} from "@/lib/timeOfDay";
import {
  useSidebarPreferences,
  SIDEBAR_ITEM_ORDER,
  SIDEBAR_ITEM_LABELS,
  type SidebarItemKey,
} from "@/hooks/useSidebarPreferences";
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { useStartupPage } from "@/hooks/useStartupPage";
import { useProjects } from "@/hooks/useProjects";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useUiScale } from "@/hooks/useUiScale";
import { useUserLocation } from "@/hooks/useUserLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import { searchTurkeyCities, TURKEY_CITIES } from "@/lib/turkeyCities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataPortabilityPanel } from "@/features/data-portability/components/DataPortabilityPanel";
import { DEFAULT_HOME_FOCUS_OPTIONS, type DailyFocusOption } from "@/features/home/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type SectionKey = "habits" | "modules" | "home" | "account" | "preferences";

const SECTIONS: { key: SectionKey; label: string; jp: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "habits", label: "Alışkanlık", jp: "習慣", icon: Sprout },
  { key: "modules", label: "Modüller", jp: "区分", icon: LayoutGrid },
  { key: "home", label: "Ana Sayfa", jp: "家", icon: Home },
  { key: "account", label: "Hesap", jp: "個人", icon: User },
  { key: "preferences", label: "Tercihler", jp: "設定", icon: SlidersHorizontal },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase mb-2 sm:hidden">{children}</div>
);

const fallbackFullName = (email?: string, fullName?: unknown) => {
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (email) return email.split("@")[0] || "Kullanıcı";
  return "Kullanıcı";
};

const SettingsDialog = ({ open, onOpenChange }: Props) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [habitDefault, setHabitDefault] = useHabitTodayDefault();
  const {
    starts: todStarts,
    labels: todLabels,
    disabled: todDisabled,
    options: todOptions,
    auto: todAuto,
    update: updateTod,
    rename: renameTod,
    setEnabled: setTodEnabled,
    reset: resetTod,
    setAutoMode: setTodAutoMode,
  } = useTimeOfDayRanges();
  const { settings: userSettings, update: updateUserSettings } = useUserSettings();
  const { scale: uiScale, setScale: setUiScale } = useUiScale();
  const { request: requestGeo, loading: geoLoading } = useUserLocation();
  const prayerQuery = usePrayerTimes();
  const [citySearch, setCitySearch] = useState("");
  const cityResults = useMemo(() => searchTurkeyCities(citySearch).slice(0, 30), [citySearch]);
  const { prefs: sidebarPrefs, setItem: setSidebarPref } = useSidebarPreferences();
  const { get: moduleLabel, rename: renameModule, reset: resetModule, labels: customLabels } = useModuleLabels();
  const { startup, setStartup } = useStartupPage();
  const { projects } = useProjects();
  const workspaceProjects = projects.filter((project) => project.kind === "project");
  const enabledModules = SIDEBAR_ITEM_ORDER.filter((k) => sidebarPrefs[k]);
  const startupValue =
    startup.type === "module" ? `mod:${startup.value}` :
    startup.type === "project" ? `prj:${startup.value}` :
    "default";
  const handleStartupChange = (v: string) => {
    if (v === "default") setStartup({ type: "default" });
    else if (v.startsWith("mod:")) {
      const key = v.slice(4);
      if (SIDEBAR_ITEM_ORDER.includes(key as SidebarItemKey) && key !== "retreat") {
        setStartup({ type: "module", value: key as Exclude<SidebarItemKey, "retreat"> });
      }
    }
    else if (v.startsWith("prj:")) setStartup({ type: "project", value: v.slice(4) });
  };
  const [section, setSection] = useState<SectionKey>("habits");
  const [email, setEmail] = useState(user?.email || "");
  const [fullName, setFullName] = useState(fallbackFullName(user?.email, user?.user_metadata?.full_name));
  const [password, setPassword] = useState("");
  const [savingFullName, setSavingFullName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  useEffect(() => {
    setEmail(user?.email || "");
    setFullName(fallbackFullName(user?.email, user?.user_metadata?.full_name));
  }, [user?.email, user?.user_metadata?.full_name]);

  const focusOptions = userSettings.home_focus_options?.length ? userSettings.home_focus_options : DEFAULT_HOME_FOCUS_OPTIONS;
  const homeTaskProjectIds = useMemo(() => userSettings.home_task_project_ids ?? [], [userSettings.home_task_project_ids]);
  const homeTaskProjectSet = useMemo(() => new Set(homeTaskProjectIds), [homeTaskProjectIds]);
  const visibleHomeTaskProjectIds = useMemo(
    () => workspaceProjects.map((project) => project.id).filter((id) => homeTaskProjectSet.has(id)),
    [homeTaskProjectSet, workspaceProjects]
  );
  const homeTaskFilterIsAll = visibleHomeTaskProjectIds.length === 0;

  const persistFocusOptions = async (next: DailyFocusOption[]) => {
    const { error } = await updateUserSettings({ home_focus_options: next.length ? next : DEFAULT_HOME_FOCUS_OPTIONS });
    if (error) toast.error("Günün Odağı güncellenemedi.");
  };

  const updateFocusOption = (index: number, patch: Partial<DailyFocusOption>) => {
    const next = focusOptions.map((option, i) => i === index ? { ...option, ...patch } : option);
    void persistFocusOptions(next);
  };

  const addFocusOption = () => {
    void persistFocusOptions([
      ...focusOptions,
      { id: crypto.randomUUID(), label: "Yeni Odak", color: "stone" },
    ]);
  };

  const removeFocusOption = (index: number) => {
    if (focusOptions.length <= 1) return;
    const next = focusOptions.filter((_, i) => i !== index);
    void persistFocusOptions(next);
  };

  const resetFocusOptions = () => {
    void persistFocusOptions(DEFAULT_HOME_FOCUS_OPTIONS);
  };

  const updateHomeTaskProjects = async (projectIds: string[] | null) => {
    const { error } = await updateUserSettings({ home_task_project_ids: projectIds && projectIds.length > 0 ? projectIds : null });
    if (error) toast.error("Ana sayfa görev kaynakları güncellenemedi.");
  };

  const toggleHomeTaskProject = (projectId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...visibleHomeTaskProjectIds, projectId]))
      : visibleHomeTaskProjectIds.filter((id) => id !== projectId);
    void updateHomeTaskProjects(next);
  };

  const requestNotif = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }
    if (Notification.permission === "granted") {
      toast("Bildirimler zaten açık.");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Bildirimler engellendi. Tarayıcı ayarlarından izin verin.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    if (result === "granted") {
      toast.success("Bildirimler açıldı.");
      try {
        new Notification("Keikaku", { body: "Bildirimler aktif." });
      } catch {
        // Some browsers grant permission but still block immediate notification creation.
      }
    } else {
      toast.error("Bildirim izni reddedildi.");
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || email === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else toast.success("Doğrulama e-postası gönderildi");
  };

  const handleFullName = async () => {
    const value = fullName.trim();
    if (!value) {
      toast.error("Ad Soyad boş olamaz.");
      return;
    }
    if (value === fallbackFullName(user?.email, user?.user_metadata?.full_name)) return;
    setSavingFullName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: value } });
    setSavingFullName(false);
    if (error) toast.error(error.message);
    else toast.success("Ad Soyad güncellendi");
  };

  const handlePassword = async () => {
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Şifre güncellendi");
      setPassword("");
    }
  };

  const handleSaveSettings = () => {
    toast.success("Kaydedildi");
    onOpenChange(false);
  };

  const enabledCount = ALL_TIME_OF_DAY_KEYS.length - todDisabled.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          // Mobile: nearly full-screen sheet. Desktop: centered modal.
          "w-screen h-[100dvh] max-w-none rounded-none border-0",
          "sm:w-[90vw] sm:h-auto sm:max-w-3xl sm:rounded-lg sm:border sm:max-h-[85vh]"
        )}
      >
        <DialogHeader className="px-4 sm:px-5 py-3 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-light tracking-wide">設定 — Ayarlar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 sm:max-h-[calc(85vh-6.75rem)]">
          {/* Sidebar / top tabs */}
          <nav
            className={cn(
              "shrink-0 border-border/60 bg-muted/20 flex gap-1",
              // Mobile: horizontal sticky tabs
              "border-b px-2 py-1.5 overflow-x-auto",
              // Desktop: vertical sidebar
              "sm:flex-col sm:border-b-0 sm:border-r sm:w-48 sm:py-3 sm:px-2 sm:overflow-visible"
            )}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors shrink-0 sm:w-full",
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs tracking-wide whitespace-nowrap">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 min-h-0">
            {section === "habits" && (
              <div className="space-y-5">
                <SectionTitle>習慣 — Alışkanlık</SectionTitle>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-light">Bugün varsayılan filtresi</div>
                    <div className="text-[10px] text-muted-foreground tracking-wide">
                      Sayfa açıldığında hangi alışkanlıklar gösterilsin
                    </div>
                  </div>
                  <div className="flex rounded-sm border border-border/60 overflow-hidden shrink-0">
                    <button
                      onClick={() => setHabitDefault("time")}
                      className={`px-3 py-1.5 text-xs tracking-wide transition-colors ${
                        habitDefault === "time" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"
                      }`}
                    >Günün saati</button>
                    <button
                      onClick={() => setHabitDefault("all")}
                      className={`px-3 py-1.5 text-xs tracking-wide transition-colors border-l border-border/60 ${
                        habitDefault === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"
                      }`}
                    >Tümü</button>
                  </div>
                </div>

                <div className="border-t border-border/60" />

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-light flex items-center gap-2">
                        Gün dilimleri
                        {todAuto && (
                          <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm bg-accent/60 text-muted-foreground">
                            Otomatik
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground tracking-wide">
                        {todAuto
                          ? "Saatler güneşin konumuna göre belirleniyor."
                          : "Adı düzenleyin, başlangıç saatini değiştirin veya dilimi kaldırın."}
                      </div>
                    </div>
                    <button
                      onClick={resetTod}
                      className="flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Sıfırla
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {ALL_TIME_OF_DAY_KEYS.map((k) => {
                      const isEnabled = !todDisabled.includes(k);
                      const opt = todOptions.find((o) => o.key === k);
                      const range = opt?.range ?? "—";
                      return (
                        <div
                          key={k}
                          className={cn(
                            "flex flex-col gap-1.5 px-2.5 py-2 rounded-sm border border-border/40 bg-card/40",
                            !isEnabled && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/70 text-xs w-4 text-center shrink-0">
                              {DEFAULT_TIME_OF_DAY_LABELS[k].jp}
                            </span>
                            <Input
                              value={todLabels[k]}
                              onChange={(e) => renameTod(k, e.target.value)}
                              disabled={!isEnabled}
                              placeholder={DEFAULT_TIME_OF_DAY_LABELS[k].label}
                              className="bg-transparent h-7 text-sm font-light flex-1 min-w-0 px-2"
                            />
                            {isEnabled ? (
                              <button
                                onClick={() => setTodEnabled(k, false)}
                                disabled={enabledCount <= 1}
                                title={enabledCount <= 1 ? "En az bir dilim olmalı" : "Dilimi kaldır"}
                                className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setTodEnabled(k, true)}
                                title="Dilimi geri ekle"
                                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <Input
                              type="time"
                              value={todAuto && opt ? opt.range.split("–")[0] : todStarts[k]}
                              onChange={(e) => updateTod(k, e.target.value)}
                              disabled={!isEnabled || todAuto}
                              className="bg-transparent h-7 text-xs w-28 px-2"
                            />
                            <span className="text-[10px] text-muted-foreground tracking-wide tabular-nums ml-auto">
                              {isEnabled ? range : "kapalı"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* Sun-position based time system */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      <Sunrise className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-sm font-light">Güneşin Konumuna Göre Belirle</div>
                        <div className="text-[10px] text-muted-foreground tracking-wide leading-relaxed">
                          Gün dilimlerinin başlangıç saatlerini namaz vakitlerine göre her gün otomatik ayarlar.
                          <br />
                          Sabah · İmsak / Öğle / İkindi / Akşam / Yatsı.
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={todAuto}
                      onCheckedChange={async (v) => {
                        setTodAutoMode(v);
                        await updateUserSettings({ auto_prayer_times: v });
                        if (v && !userSettings.city && userSettings.latitude == null) {
                          toast("Konum veya şehir seçin");
                        }
                      }}
                      className="shrink-0"
                    />
                  </div>

                  {todAuto && (
                    <div className="space-y-3 pl-6 animate-in fade-in slide-in-from-top-1 duration-300">
                      {/* Current city / status */}
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-light tracking-wide">
                          {userSettings.city
                            ? userSettings.city
                            : userSettings.latitude != null
                              ? `${userSettings.latitude.toFixed(2)}°, ${userSettings.longitude?.toFixed(2)}°`
                              : "Konum belirtilmedi"}
                        </span>
                        {prayerQuery.isFetching && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                        )}
                      </div>

                      {prayerQuery.data && (
                        <div className="text-[10px] text-muted-foreground tracking-wide tabular-nums grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1">
                          {ALL_TIME_OF_DAY_KEYS.map((k) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span>{todLabels[k]}</span>
                              <span>{prayerQuery.data!.starts[k]}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {prayerQuery.error && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 tracking-wide">
                          Vakit bilgisi alınamadı, son kayıtlı veriler kullanılıyor.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={geoLoading}
                          onClick={async () => {
                            const pos = await requestGeo();
                            if (pos) {
                              await updateUserSettings({
                                latitude: pos.latitude,
                                longitude: pos.longitude,
                                location_permission: true,
                                city: null,
                              });
                              toast.success("Konum güncellendi");
                            } else {
                              await updateUserSettings({ location_permission: false });
                              toast("Konum izni verilmedi, şehir seçebilirsiniz.");
                            }
                          }}
                          className="h-8 text-xs gap-1.5"
                        >
                          {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                          Konumu Güncelle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => prayerQuery.refetch()}
                          className="h-8 text-xs gap-1.5"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Vakitleri Yenile
                        </Button>
                      </div>

                      {/* City picker */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
                          Şehir Seç (Türkiye)
                        </div>
                        <div className="relative">
                          <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            placeholder="Şehir ara..."
                            className="bg-transparent h-8 text-xs pl-7"
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto rounded-sm border border-border/40 bg-card/30">
                          {(citySearch ? cityResults : TURKEY_CITIES).map((c) => {
                            const active = userSettings.city === c.name;
                            return (
                              <button
                                key={c.ascii}
                                onClick={async () => {
                                  await updateUserSettings({
                                    city: c.name,
                                    country: "Turkey",
                                    latitude: c.lat,
                                    longitude: c.lng,
                                  });
                                  toast.success(`${c.name} seçildi`);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs tracking-wide transition-colors",
                                  active
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                                )}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                          {citySearch && cityResults.length === 0 && (
                            <div className="px-3 py-3 text-[10px] text-muted-foreground tracking-wide text-center">
                              Sonuç bulunamadı
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === "modules" && (
              <div className="space-y-3">
                <SectionTitle>区分 — Modüller</SectionTitle>
                <div className="text-[10px] text-muted-foreground tracking-wide">
                  Yan menüde hangi bölümler görünsün ve adları
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  {SIDEBAR_ITEM_ORDER.map((key) => {
                    const isCustom = !!customLabels[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-2 py-2 rounded-sm border border-border/40 bg-card/40"
                      >
                        <Checkbox
                          checked={sidebarPrefs[key]}
                          onCheckedChange={(v) => setSidebarPref(key, v === true)}
                          className="shrink-0"
                        />
                        <Input
                          value={moduleLabel(key)}
                          onChange={(e) => renameModule(key, e.target.value)}
                          placeholder={SIDEBAR_ITEM_LABELS[key]}
                          className="bg-transparent h-7 text-sm font-light flex-1 min-w-0 px-2"
                        />
                        <span className="text-[9px] text-muted-foreground/70 tracking-wide shrink-0 hidden sm:inline">
                          {SIDEBAR_ITEM_LABELS[key]}
                        </span>
                        {isCustom && (
                          <button
                            onClick={() => resetModule(key)}
                            title="Varsayılan ada dön"
                            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {section === "home" && (
              <div className="space-y-5">
                <SectionTitle>家 — Ana Sayfa</SectionTitle>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-light">Günün Odağı</div>
                      <div className="text-[10px] text-muted-foreground tracking-wide">
                        Ana Sayfa odak seçiminde görünen seçenekler
                      </div>
                    </div>
                    <button
                      onClick={resetFocusOptions}
                      className="flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Sıfırla
                    </button>
                  </div>
                  <div className="space-y-2 pt-1">
                    {focusOptions.map((option, index) => (
                      <div key={option.id} className="flex flex-col sm:flex-row gap-2 rounded-md border border-border/60 bg-card/30 p-2">
                        <Input
                          value={option.label}
                          onChange={(e) => updateFocusOption(index, { label: e.target.value })}
                          className="h-8 text-xs bg-transparent flex-1"
                        />
                        <Select
                          value={option.color || "stone"}
                          onValueChange={(color) => updateFocusOption(index, { color })}
                        >
                          <SelectTrigger className="h-8 text-xs sm:w-40">
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
                        <button
                          onClick={() => removeFocusOption(index)}
                          disabled={focusOptions.length <= 1}
                          title="Seçeneği kaldır"
                          className="inline-flex h-8 items-center justify-center rounded-sm px-2 text-muted-foreground hover:text-destructive hover:bg-accent/40 transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addFocusOption}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Odak ekle
                  </button>
                </div>

                <div className="border-t border-border/60" />

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-light">Ana sayfada gösterilecek projeler</div>
                      <div className="text-[10px] text-muted-foreground tracking-wide">
                        Seçim boşsa Görevler / Yapılıyor alanı tüm projelerden görev gösterir.
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void updateHomeTaskProjects(null)}
                        className="h-7 px-2 text-[10px]"
                      >
                        Tüm projeler
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void updateHomeTaskProjects(workspaceProjects.map((project) => project.id))}
                        disabled={workspaceProjects.length === 0}
                        className="h-7 px-2 text-[10px]"
                      >
                        Tümünü seç
                      </Button>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 rounded-md border border-border/60 bg-card/30 px-3 py-2">
                    <Checkbox
                      checked={homeTaskFilterIsAll}
                      onCheckedChange={() => void updateHomeTaskProjects(null)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs tracking-wide">Tüm projeler</span>
                      <span className="block text-[10px] text-muted-foreground tracking-wide">
                        Varsayılan davranış: proje filtresi uygulanmaz.
                      </span>
                    </span>
                  </label>

                  <div className="max-h-64 overflow-y-auto rounded-md border border-border/40 bg-card/20">
                    {workspaceProjects.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[10px] text-muted-foreground tracking-wide">
                        Gösterilecek proje yok.
                      </div>
                    ) : (
                      workspaceProjects.map((project) => (
                        <label
                          key={project.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs tracking-wide transition-colors hover:bg-accent/40"
                        >
                          <Checkbox
                            checked={!homeTaskFilterIsAll && homeTaskProjectSet.has(project.id)}
                            onCheckedChange={(checked) => toggleHomeTaskProject(project.id, checked === true)}
                            className="shrink-0"
                          />
                          <span className="shrink-0">{project.emoji}</span>
                          <span className="min-w-0 truncate">{project.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {section === "account" && (
              <div className="space-y-5">
                <SectionTitle>個人 — Hesap</SectionTitle>
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Ad Soyad</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ad Soyad"
                      className="bg-transparent h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleFullName}
                      disabled={savingFullName || !fullName.trim() || fullName.trim() === fallbackFullName(user?.email, user?.user_metadata?.full_name)}
                      className="shrink-0"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">E-posta</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      className="bg-transparent h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEmail}
                      disabled={savingEmail || email === user?.email || !email.trim()}
                      className="shrink-0"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Yeni şifre</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="bg-transparent h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePassword}
                      disabled={savingPassword || password.length < 6}
                      className="shrink-0"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border/60" />

                <DataPortabilityPanel />
              </div>
            )}

            {section === "preferences" && (
              <div className="space-y-5">
                <SectionTitle>設定 — Tercihler</SectionTitle>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-light">Karanlık tema</div>
                    <div className="text-[10px] text-muted-foreground tracking-wide">Yumuşak tonlarda gece modu</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors shrink-0"
                  >
                    {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    <span className="text-xs tracking-wide">{theme === "dark" ? "Aydınlık" : "Karanlık"}</span>
                  </button>
                </div>

                <div className="border-t border-border/60" />

                <div className="space-y-2">
                  <div className="text-sm font-light">Yazı ve arayüz boyutu</div>
                  <div className="text-[10px] text-muted-foreground tracking-wide">
                    Tüm uygulama ölçeklenir — yazı, boşluklar, butonlar ve simgeler birlikte büyür. Bu tercih sadece bu cihazda saklanır.
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {([
                      { v: "normal", label: "Normal", jp: "標準" },
                      { v: "large", label: "Büyük", jp: "大" },
                      { v: "xlarge", label: "Çok Büyük", jp: "特大" },
                    ] as const).map((opt) => {
                      const active = uiScale === opt.v;
                      return (
                        <button
                          key={opt.v}
                          onClick={() => setUiScale(opt.v)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-sm border transition-colors",
                            active
                              ? "bg-accent text-foreground border-foreground/40"
                              : "border-border/60 text-muted-foreground hover:bg-accent/40"
                          )}
                        >
                          <span
                            className="font-light leading-none"
                            style={{
                              fontSize:
                                opt.v === "normal" ? "1rem" : opt.v === "large" ? "1.15rem" : "1.3rem",
                            }}
                          >
                            Aa
                          </span>
                          <span className="text-[10px] tracking-[0.15em] uppercase">{opt.label}</span>
                          <span className="text-[9px] text-muted-foreground/70">{opt.jp}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60" />

                <div className="space-y-2">
                  <div className="text-sm font-light">Açılış sayfası</div>
                  <div className="text-[10px] text-muted-foreground tracking-wide">
                    Uygulama açıldığında hangi sayfaya gidilsin (tüm cihazlarda eşitlenir)
                  </div>
                  <Select value={startupValue} onValueChange={handleStartupChange}>
                    <SelectTrigger className="h-9 text-sm font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="default">Varsayılan (ilk proje)</SelectItem>
                      {enabledModules.length > 0 && (
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Modüller</div>
                      )}
                      {enabledModules.map((k) => (
                        <SelectItem key={`mod:${k}`} value={`mod:${k}`}>{moduleLabel(k)}</SelectItem>
                      ))}
                      {projects.length > 0 && (
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Projeler</div>
                      )}
                      {projects.map((p) => (
                        <SelectItem key={`prj:${p.id}`} value={`prj:${p.id}`}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-light">Varsayılan çalışma alanı</div>
                  <div className="text-[10px] text-muted-foreground tracking-wide">
                    Pomodoro sayfasındaki görev panosu bu projeyi gösterir
                  </div>
                  <Select
                    value={userSettings.default_pomodoro_project_id ?? "default"}
                    onValueChange={(value) => updateUserSettings({
                      default_pomodoro_project_id: value === "default" ? null : value,
                    })}
                  >
                    <SelectTrigger className="h-9 text-sm font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="default">Varsayılan proje</SelectItem>
                      {workspaceProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border/60" />

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-light">Bildirimler</div>
                    <div className="text-[10px] text-muted-foreground tracking-wide">
                      {notifPerm === "granted" && "Açık — Pomodoro bittiğinde haber verilir"}
                      {notifPerm === "default" && "Site arka planda olsa bile haber alın"}
                      {notifPerm === "denied" && "Engellendi — Tarayıcı ayarlarından açın"}
                      {notifPerm === "unsupported" && "Bu tarayıcı desteklemiyor"}
                    </div>
                  </div>
                  <button
                    onClick={requestNotif}
                    disabled={notifPerm === "unsupported"}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {notifPerm === "granted" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    <span className="text-xs tracking-wide">
                      {notifPerm === "granted" ? "Açık" : notifPerm === "denied" ? "Engelli" : "Aç"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 sm:px-5 py-3 bg-background/95 flex justify-end">
          <Button size="sm" onClick={handleSaveSettings} className="min-w-24">
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
