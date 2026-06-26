import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { PrayerTimesSync } from "@/components/PrayerTimesSync";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePageState } from "@/hooks/usePageState";
import { useProjects } from "@/hooks/useProjects";
import type { ViewKey } from "@/hooks/useProjectViews";

type ProjectContext = ReturnType<typeof useProjects>;

const AppShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectContext = useProjects();
  const { projects, createProject, updateProject, deleteProject } = projectContext;
  const {
    section,
    selectedProjectId,
    view,
    selectedNotebookId,
    selectedKnowledgeNoteId,
    setSection,
    setSelectedProjectId,
    setView,
    setSelectedNotebookId,
    setSelectedKnowledgeNoteId,
  } = usePageState();

  useEffect(() => {
    const routeSection = location.pathname === "/habits"
      ? "habits"
      : location.pathname === "/journal"
        ? "journal"
        : null;

    if (!routeSection) return;
    if (section !== routeSection) setSection(routeSection);
    if (selectedProjectId !== null) setSelectedProjectId(null);
  }, [location.pathname, section, selectedProjectId, setSection, setSelectedProjectId]);

  const selectProject = (id: string, nextView?: ViewKey) => {
    setSection("project");
    setSelectedProjectId(id);
    const project = projects.find((p) => p.id === id);
    const projectViews = (project?.enabled_views?.length ? project.enabled_views : ["table", "notes"]) as ViewKey[];
    setView(nextView || projectViews[0] || "table");
    navigate("/");
  };

  const createAndSelectProject = async (name: string, parentId?: string) => {
    const project = await createProject(name, parentId);
    if (!project) return;
    setSelectedProjectId(project.id);
    setSection("project");
    setView("table");
    navigate("/");
  };

  const deleteAndSelectFallback = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId !== id) return;
    const nextProject = projects.find((p) => p.id !== id && p.parent_id !== id);
    if (nextProject) {
      setSelectedProjectId(nextProject.id);
      setSection("project");
      const projectViews = (nextProject.enabled_views?.length ? nextProject.enabled_views : ["table", "notes"]) as ViewKey[];
      setView(projectViews[0]);
    } else {
      setSelectedProjectId(null);
      setSection("home");
    }
    navigate("/");
  };

  const selectHomeSection = (nextSection: typeof section) => {
    setSection(nextSection);
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PrayerTimesSync />
        <AppSidebar
          projects={projects}
          selectedId={selectedProjectId}
          selectedView={view}
          section={section}
          selectedNotebookId={selectedNotebookId}
          selectedKnowledgeNoteId={selectedKnowledgeNoteId}
          onSelect={selectProject}
          onSelectHome={() => selectHomeSection("home")}
          onCreate={createAndSelectProject}
          onDelete={deleteAndSelectFallback}
          onUpdateProject={updateProject}
          onSelectTrash={() => selectHomeSection("trash")}
          onSelectJournal={() => selectHomeSection("journal")}
          onSelectHabits={() => selectHomeSection("habits")}
          onSelectRetreat={() => selectHomeSection("retreat")}
          onSelectNotebook={(id) => {
            setSelectedNotebookId(id);
            setSelectedKnowledgeNoteId(null);
            setSection("notebook");
            navigate("/");
          }}
          onSelectKnowledgeNote={(id) => {
            setSelectedKnowledgeNoteId(id);
            setSection("notebook");
            navigate("/");
          }}
        />
        <Outlet context={projectContext} />
      </div>
    </SidebarProvider>
  );
};

export const useAppShellProjects = () => useOutletContext<ProjectContext>();

export default AppShell;
