import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, Table as TableIcon, GanttChart, Kanban, Calendar, Plus, Undo, Redo, Moon, Sun, LayoutGrid, type LucideIcon } from "lucide-react";
import AppSidebar, { ProjectIconPicker } from "@/components/AppSidebar";
import NotesView from "@/components/NotesView";
import TableView from "@/components/TableView";
import GanttView from "@/components/GanttView";
import KanbanView from "@/components/KanbanView";
import WeeklyCalendarView from "@/components/WeeklyCalendarView";
import JournalView from "@/components/JournalView";
import BacklogView from "@/components/BacklogView";
import TrashView from "@/components/TrashView";
import HabitsView from "@/components/HabitsView";
import InzivaView from "@/components/InzivaView";
import NotebookView from "@/features/knowledge/components/NotebookView";
import { useProjects } from "@/hooks/useProjects";
import { ViewKey } from "@/hooks/useProjectViews";
import { useUndo } from "@/hooks/useUndo";
import { useTheme } from "@/hooks/useTheme";
import { usePageState } from "@/hooks/usePageState";
import { useStartupPage } from "@/hooks/useStartupPage";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VIEWS: { id: ViewKey; label: string; jp: string; icon: LucideIcon }[] = [
  { id: "notes", label: "Notlar", jp: "ノート", icon: FileText },
  { id: "table", label: "Tablo", jp: "表", icon: TableIcon },
  { id: "gantt", label: "Gantt", jp: "ガント", icon: GanttChart },
  { id: "kanban", label: "Kanban", jp: "看板", icon: Kanban },
  { id: "calendar", label: "Takvim", jp: "暦", icon: Calendar },
];

// Oturum başına bir kez açılış sayfası uygulansın (Index remount edildiğinde tekrarlanmasın)
let startupApplied = false;

const Index = () => {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const { undo, redo, canUndo, canRedo } = useUndo();
  const { theme, toggle: toggleTheme } = useTheme();
  const { section, selectedProjectId, view, journalDate, selectedNotebookId, selectedKnowledgeNoteId, setSection, setSelectedProjectId, setView, setJournalDate, setSelectedNotebookId, setSelectedKnowledgeNoteId } = usePageState();
  const { startup } = useStartupPage();
  const { loading: settingsLoading } = useUserSettings();
  const navigate = useNavigate();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectViews: ViewKey[] = selectedProject?.enabled_views || ["table", "notes"];

  // İlk yüklemede açılış sayfası tercihini uygula
  useEffect(() => {
    if (loading || settingsLoading || startupApplied) return;
    // Sadece hiçbir bölüm/proje seçilmemişken (taze açılış) uygula.
    // Aksi halde başka sayfadan ("/pomodoro" gibi) gelen kullanıcının seçimini ezeriz.
    if (section !== "project" || selectedProjectId !== null) {
      startupApplied = true;
      return;
    }
    startupApplied = true;

    if (startup.type === "module") {
      if (startup.value === "workHistory") { navigate("/work-history"); return; }
      if (startup.value === "pomodoro") { navigate("/pomodoro"); return; }
      if (startup.value === "backlog" || startup.value === "journal" || startup.value === "habits") {
        setSection(startup.value);
        return;
      }
    }
    if (startup.type === "project") {
      const p = projects.find((x) => x.id === startup.value);
      if (p) {
        setSelectedProjectId(p.id);
        setSection("project");
        const pvs = (p.enabled_views?.length ? p.enabled_views : ["table", "notes"]) as ViewKey[];
        setView(pvs[0]);
        return;
      }
    }
    const def = projects.find((p) => p.is_default);
    if (def) {
      setSelectedProjectId(def.id);
      setSection("project");
      const pvs = (def.enabled_views?.length ? def.enabled_views : ["table", "notes"]) as ViewKey[];
      setView(pvs[0]);
    }
  }, [loading, settingsLoading, projects, startup]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleCreate = async (name: string, parentId?: string) => {
    const p = await createProject(name, parentId);
    if (p) { setSelectedProjectId(p.id); setSection("project"); setView("table"); }
  };

  const handleSelect = (id: string, v?: ViewKey) => {
    setSection("project");
    setSelectedProjectId(id);
    const project = projects.find((p) => p.id === id);
    const pvs = (project?.enabled_views?.length ? project.enabled_views : ["table", "notes"]) as ViewKey[];
    if (v) setView(v);
    else setView(pvs[0] || "table");
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId === id) {
      const def = projects.find((p) => p.is_default && p.id !== id);
      if (def) {
        setSelectedProjectId(def.id);
        setSection("project");
        const pvs = (def.enabled_views?.length ? def.enabled_views : ["table", "notes"]) as ViewKey[];
        setView(pvs[0]);
      } else {
        setSelectedProjectId(null);
        setSection("backlog");
      }
    }
  };

  const addView = (v: ViewKey) => {
    if (!selectedProject) return;
    if (projectViews.includes(v)) return;
    updateProject(selectedProject.id, { enabled_views: [...projectViews, v] });
  };

  const availableToAdd = VIEWS.filter((v) => !projectViews.includes(v.id));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          projects={projects}
          selectedId={selectedProjectId}
          selectedView={view}
          section={section}
          selectedNotebookId={selectedNotebookId}
          selectedKnowledgeNoteId={selectedKnowledgeNoteId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateProject={updateProject}
          onSelectBacklog={() => setSection("backlog")}
          onSelectTrash={() => setSection("trash")}
          onSelectJournal={() => setSection("journal")}
          onSelectHabits={() => setSection("habits")}
          onSelectRetreat={() => setSection("retreat")}
          onSelectNotebook={(id) => { setSelectedNotebookId(id); setSelectedKnowledgeNoteId(null); setSection("notebook"); }}
          onSelectKnowledgeNote={(id) => { setSelectedKnowledgeNoteId(id); setSection("notebook"); }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border/60 px-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground" />
              {section === "project" && selectedProject && (
                <h1 className="text-base tracking-wide truncate font-light flex items-center gap-2">
                  <ProjectIconPicker
                    icon={selectedProject.icon}
                    iconColor={selectedProject.icon_color}
                    onChange={(updates) => updateProject(selectedProject.id, updates)}
                  />
                  {selectedProject.name}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {section === "project" && selectedProject && (
                <>
                  {/* Desktop: tüm view sekmeleri */}
                  <nav className="hidden sm:flex items-center gap-0.5 mr-2">
                    {VIEWS.filter((v) => projectViews.includes(v.id)).map((v) => {
                      const Icon = v.icon;
                      const active = view === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setView(v.id)}
                          title={`${v.jp} ${v.label}`}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs tracking-wide transition-colors ${
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">{v.label}</span>
                        </button>
                      );
                    })}
                    {availableToAdd.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            title="Görünüm ekle"
                            className="flex items-center gap-1 px-1.5 py-1 rounded-sm text-xs text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1" align="end">
                          {availableToAdd.map((v) => {
                            const Icon = v.icon;
                            return (
                              <button
                                key={v.id}
                                onClick={() => { addView(v.id); setView(v.id); }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                              >
                                <Icon className="h-3 w-3" />
                                <span>{v.label}</span>
                                <span className="text-muted-foreground/60 ml-auto text-[9px]">{v.jp}</span>
                              </button>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                    )}
                  </nav>

                  {/* Mobil: tek bir görünüm seçici */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs bg-accent/60 text-accent-foreground"
                        title="Görünüm"
                      >
                        {(() => {
                          const cur = VIEWS.find((v) => v.id === view);
                          const Icon = cur?.icon || LayoutGrid;
                          return <><Icon className="h-3.5 w-3.5" /><span className="tracking-wide">{cur?.label || "Görünüm"}</span></>;
                        })()}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                      {VIEWS.filter((v) => projectViews.includes(v.id)).map((v) => {
                        const Icon = v.icon;
                        const active = view === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setView(v.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm transition-colors ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                          >
                            <Icon className="h-3 w-3" />
                            <span className="flex-1 text-left">{v.label}</span>
                            <span className="text-muted-foreground/60 text-[9px]">{v.jp}</span>
                          </button>
                        );
                      })}
                      {availableToAdd.length > 0 && <div className="border-t border-border/60 my-1" />}
                      {availableToAdd.map((v) => {
                        const Icon = v.icon;
                        return (
                          <button
                            key={v.id}
                            onClick={() => { addView(v.id); setView(v.id); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{v.label}</span>
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </>
              )}
              <button
                onClick={() => undo()}
                disabled={!canUndo}
                title={`Geri al (${typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘Z" : "Ctrl+Z"})`}
                className="hidden sm:inline-flex p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
              >
                <Undo className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => redo()}
                disabled={!canRedo}
                title={`Yinele (${typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘⇧Z" : "Ctrl+Shift+Z"})`}
                className="hidden sm:inline-flex p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
              >
                <Redo className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Aydınlık tema" : "Karanlık tema"}
                className="hidden sm:inline-flex p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            {section === "backlog" && <BacklogView />}
            {section === "trash" && <TrashView />}
            {section === "journal" && (
              <JournalView key={journalDate} date={journalDate} onDateChange={setJournalDate} />
            )}
            {section === "habits" && <HabitsView />}
            {section === "retreat" && <InzivaView />}
            {section === "notebook" && (
              <NotebookView
                noteId={selectedKnowledgeNoteId}
                selectedNotebookId={selectedNotebookId}
                onClearSelection={() => setSelectedKnowledgeNoteId(null)}
              />
            )}
            {section === "project" && (
              !selectedProject ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <p className="text-2xl tracking-widest">計画</p>
                    <p className="text-xs">Bir proje seçin veya yeni bir proje oluşturun</p>
                  </div>
                </div>
              ) : !projectViews.includes(view) ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <p className="text-xs">Bu görünüm bu projeye eklenmemiş</p>
                </div>
              ) : (
                <>
                  {view === "notes" && <NotesView key={selectedProject.id} projectId={selectedProject.id} />}
                  {view === "table" && <TableView projectId={selectedProject.id} />}
                  {view === "gantt" && <GanttView projectId={selectedProject.id} />}
                  {view === "kanban" && <KanbanView projectId={selectedProject.id} />}
                  {view === "calendar" && <WeeklyCalendarView projectId={selectedProject.id} />}
                </>
              )
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
