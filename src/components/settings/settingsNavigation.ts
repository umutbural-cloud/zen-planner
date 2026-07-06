import {
  Bell,
  FolderKanban,
  Home,
  Info,
  LayoutGrid,
  Lock,
  Shield,
  SlidersHorizontal,
  Sprout,
  Timer,
  Trash,
  type LucideIcon,
} from "lucide-react";
import type { SidebarItemKey } from "@/hooks/useSidebarPreferences";

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
    description: "Güne başlarken gördüğün alanları ve görev kaynaklarını düzenle.",
  },
  "tasks-projects": {
    title: "Görevler ve Projeler",
    description: "Projelerini düzenle, görünüm tercihlerini belirle ve kullanılmayan projeleri çöp kutusuna taşı.",
  },
  "pomodoro-focus": {
    title: "Pomodoro ve Odak",
    description: "Çalışma kategorilerini, varsayılan süreleri ve odak akışını düzenle.",
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

export type ModuleVisibilityRow = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  preferenceKey?: SidebarItemKey;
};

export const MODULE_VISIBILITY_ROWS: ModuleVisibilityRow[] = [
  {
    id: "home",
    title: "Ana Sayfa",
    description: "Günün odağı, görev özeti ve hızlı başlangıç alanları.",
    icon: Home,
  },
  {
    id: "tasks-projects",
    title: "Görevler ve Projeler",
    description: "Projeler, görevler, tablolar ve çalışma görünümleri.",
    icon: FolderKanban,
  },
  {
    id: "pomodoro-focus",
    title: "Pomodoro ve Odak",
    description: "Odak oturumları, çalışma kategorileri ve süre ayarları.",
    icon: Timer,
    preferenceKey: "pomodoro",
  },
  {
    id: "habits",
    title: "Alışkanlıklar",
    description: "Günlük rutinler, gün dilimleri ve takip ayarları.",
    icon: Sprout,
    preferenceKey: "habits",
  },
  {
    id: "journal",
    title: "Günlük",
    description: "Günlük kayıtlarını ve kişisel not akışını gösterir.",
    icon: LayoutGrid,
    preferenceKey: "journal",
  },
  {
    id: "work-history",
    title: "Çalışma Geçmişi",
    description: "Tamamlanan odak oturumlarını ve geçmiş kayıtları gösterir.",
    icon: Timer,
    preferenceKey: "workHistory",
  },
  {
    id: "trash",
    title: "Çöp Kutusu",
    description: "Silinen öğeleri geri yükleme ve kalıcı silme alanı.",
    icon: Trash,
  },
];

export const MODULE_SETTINGS_LINKS: {
  section: SettingsSectionKey;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    section: "home",
    title: "Ana Sayfa",
    description: "Günün Odağı ve ana sayfa görev kaynaklarını düzenle.",
    icon: Home,
  },
  {
    section: "tasks-projects",
    title: "Görevler ve Projeler",
    description: "Projelerini, ikonlarını ve görünüm tercihlerini yönet.",
    icon: FolderKanban,
  },
  {
    section: "pomodoro-focus",
    title: "Pomodoro ve Odak",
    description: "Çalışma kategorileri ve varsayılan süreleri düzenle.",
    icon: Timer,
  },
  {
    section: "habits",
    title: "Alışkanlıklar",
    description: "Gün dilimleri, varsayılan filtre ve otomatik vakit sistemini yönet.",
    icon: Sprout,
  },
];
