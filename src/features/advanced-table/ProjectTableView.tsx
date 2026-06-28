import { useEffect, useState } from "react";
import TableView from "@/components/TableView";
import { Switch } from "@/components/ui/switch";
import AdvancedTaskTableView from "./AdvancedTaskTableView";

type ProjectTableMode = "legacy" | "advanced";

type ProjectTableViewProps = {
  projectId: string;
};

const getModeKey = (projectId: string) => `zen:project-table-mode:v1:${projectId}`;

const readMode = (projectId: string): ProjectTableMode => {
  if (typeof window === "undefined") return "legacy";
  const value = window.localStorage.getItem(getModeKey(projectId));
  return value === "advanced" ? "advanced" : "legacy";
};

const saveMode = (projectId: string, mode: ProjectTableMode) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getModeKey(projectId), mode);
};

const ProjectTableView = ({ projectId }: ProjectTableViewProps) => {
  const [mode, setMode] = useState<ProjectTableMode>(() => readMode(projectId));

  useEffect(() => {
    setMode(readMode(projectId));
  }, [projectId]);

  const handleModeChange = (checked: boolean) => {
    const nextMode: ProjectTableMode = checked ? "advanced" : "legacy";
    setMode(nextMode);
    saveMode(projectId, nextMode);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/35 px-4 py-3 md:rounded-sm md:bg-card/20 md:px-3 md:py-2">
        <h2 className="text-lg font-light tracking-wide">Görevler</h2>
        <div className="flex min-h-10 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground md:min-h-0">
          <span className={mode === "legacy" ? "text-foreground" : undefined}>Basit</span>
          <Switch checked={mode === "advanced"} onCheckedChange={handleModeChange} aria-label="Gelişmiş tablo modu" />
          <span className={mode === "advanced" ? "text-foreground" : undefined}>Gelişmiş</span>
        </div>
      </div>

      {mode === "advanced" ? (
        <AdvancedTaskTableView projectId={projectId} />
      ) : (
        <TableView projectId={projectId} showHeader={false} />
      )}
    </div>
  );
};

export default ProjectTableView;
