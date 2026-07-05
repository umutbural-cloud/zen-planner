import {
  Bell,
  FolderKanban,
  Home,
  Info,
  LayoutGrid,
  ListChecks,
  Lock,
  Shield,
  SlidersHorizontal,
  Sprout,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type SettingsSectionKey =
  | "experience"
  | "modules"
  | "home"
  | "tasks-projects"
  | "pomodoro-focus"
  | "habits"
  | "notifications"
  | "data-privacy"
  | "account-security"
  | "about";

export type SettingsNavItem = {
  key: SettingsSectionKey;
  label: string;
  icon: LucideIcon;
  children?: SettingsNavItem[];
};

export const SETTINGS_NAVIGATION: SettingsNavItem[] = [
  { key: "experience", label: "Kullanıcı Deneyimi", icon: SlidersHorizontal },
  {
    key: "modules",
    label: "Modüller",
    icon: LayoutGrid,
    children: [
      { key: "home", label: "Ana Sayfa", icon: Home },
      { key: "tasks-projects", label: "Görevler ve Projeler", icon: FolderKanban },
      { key: "pomodoro-focus", label: "Pomodoro ve Odak", icon: Timer },
      { key: "habits", label: "Alışkanlıklar", icon: Sprout },
    ],
  },
  { key: "notifications", label: "Bildirimler", icon: Bell },
  { key: "data-privacy", label: "Veri ve Gizlilik", icon: Shield },
  { key: "account-security", label: "Hesap ve Güvenlik", icon: Lock },
  { key: "about", label: "Uygulama Hakkında", icon: Info },
];

export const SETTINGS_SECTION_COPY: Record<SettingsSectionKey, { title: string; description: string }> = {
  experience: {
    title: "Kullanıcı Deneyimi",
    description: "Zen Planner'ın açılışını, temasını ve okuma rahatlığını bu panelden kişiselleştir.",
  },
  modules: {
    title: "Modüller",
    description: "Zen Planner'da hangi alanları kullanacağını seç ve isimlerini kendine göre düzenle.",
  },
  home: {
    title: "Ana Sayfa",
    description: "Ana Sayfa ayarları sonraki fazda mevcut ayarlarla bağlanacak.",
  },
  "tasks-projects": {
    title: "Görevler ve Projeler",
    description: "Görevler ve projeler ayarları sonraki fazda mevcut ayarlarla bağlanacak.",
  },
  "pomodoro-focus": {
    title: "Pomodoro ve Odak",
    description: "Pomodoro ve odak ayarları sonraki fazda mevcut ayarlarla bağlanacak.",
  },
  habits: {
    title: "Alışkanlıklar",
    description: "Alışkanlık ayarları sonraki fazda mevcut ayarlarla bağlanacak.",
  },
  notifications: {
    title: "Bildirimler",
    description: "Hatırlatmalar ve odak bildirimleri yakında burada yönetilecek.",
  },
  "data-privacy": {
    title: "Veri ve Gizlilik",
    description: "Verilerini dışa aktar, içe aktar ve gizlilik yaklaşımını görüntüle.",
  },
  "account-security": {
    title: "Hesap ve Güvenlik",
    description: "Profil bilgilerini, giriş e-postanı ve şifreni yönet.",
  },
  about: {
    title: "Uygulama Hakkında",
    description: "Zen Planner'ın sürümünü, PWA durumunu ve güncelleme bilgilerini görüntüle.",
  },
};

export const MODULE_SETTING_ROWS = [
  "Ana Sayfa",
  "Görevler ve Projeler",
  "Pomodoro ve Odak",
  "Günlük",
  "Alışkanlıklar",
  "Çalışma Geçmişi",
];
