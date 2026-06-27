import { BookOpen, Home, ListChecks, Repeat, Timer, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPrimaryNavigationKey, type PrimaryNavigationKey } from "@/lib/urlState";
import { usePageState } from "@/hooks/usePageState";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { Project } from "@/hooks/useProjects";
import type { ViewKey } from "@/hooks/useProjectViews";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  key: PrimaryNavigationKey;
  label: string;
  icon: LucideIcon;
  prominent?: boolean;
  onSelect: () => void;
};

export const MobileBottomNav = ({ projects }: { projects: Project[] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useUserSettings();
  const { section, setSection, setSelectedProjectId, setView } = usePageState();
  const activeKey = getPrimaryNavigationKey(location.pathname, section);
  const workspaceProjects = projects.filter((project) => project.kind === "project");
  const defaultTasksProject = settings.default_pomodoro_project_id
    ? workspaceProjects.find((project) => project.id === settings.default_pomodoro_project_id)
    : workspaceProjects.find((project) => project.is_default);

  const selectDefaultTasksProject = () => {
    setSection("project");
    if (defaultTasksProject) {
      const projectViews = (defaultTasksProject.enabled_views?.length ? defaultTasksProject.enabled_views : ["table", "notes"]) as ViewKey[];
      setSelectedProjectId(defaultTasksProject.id);
      setView(projectViews.includes("table") ? "table" : projectViews[0] || "table");
    }
    navigate("/");
  };

  const items: MobileNavItem[] = [
    {
      key: "project",
      label: "Görevler",
      icon: ListChecks,
      onSelect: selectDefaultTasksProject,
    },
    {
      key: "pomodoro",
      label: "Pomodoro",
      icon: Timer,
      onSelect: () => navigate("/pomodoro"),
    },
    {
      key: "home",
      label: "Ana Sayfa",
      icon: Home,
      prominent: true,
      onSelect: () => {
        setSelectedProjectId(null);
        setSection("home");
        navigate("/");
      },
    },
    {
      key: "habits",
      label: "Alışkanlıklar",
      icon: Repeat,
      onSelect: () => navigate("/habits"),
    },
    {
      key: "journal",
      label: "Günlük",
      icon: BookOpen,
      onSelect: () => navigate("/journal"),
    },
  ];

  return (
    <nav
      aria-label="Mobil ana gezinme"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={item.onSelect}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-light tracking-wide transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-accent/45 hover:text-foreground",
                item.prominent && "relative -mt-4",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  item.prominent && "h-10 w-10 border border-border/70 bg-card shadow-sm",
                  active && "bg-accent text-accent-foreground",
                  item.prominent && active && "bg-foreground text-background",
                )}
              >
                <Icon className={cn(item.prominent ? "h-4.5 w-4.5" : "h-4 w-4")} strokeWidth={1.8} />
              </span>
              <span className={cn("leading-none", item.prominent && "mt-0.5")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
