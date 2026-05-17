import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, LogOut, ChevronRight, ChevronUp, ChevronDown, Pencil, FileText, Table as TableIcon, GanttChart, Kanban, Calendar, X, Package, Trash, Settings, Repeat, Check, Clock, Wind, type LucideIcon } from "lucide-react";
import { useSidebarPreferences } from "@/hooks/useSidebarPreferences";
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { HABIT_ICON_GROUPS, getHabitIcon } from "@/lib/habitIcons";
import { CATEGORY_COLORS, colorHex } from "@/hooks/useHabitCategories";
import SettingsDialog from "./SettingsDialog";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { Project } from "@/hooks/useProjects";
import type { ViewKey } from "@/hooks/useProjectViews";
import PomodoroSidebarWidget from "./PomodoroSidebarWidget";
import NotebookSidebarTree from "@/features/knowledge/components/NotebookSidebarTree";



const VIEW_META: Record<ViewKey, { label: string; jp: string; icon: LucideIcon }> = {
  notes: { label: "Notlar", jp: "ノート", icon: FileText },
  table: { label: "Tablo", jp: "表", icon: TableIcon },
  gantt: { label: "Gantt", jp: "ガント", icon: GanttChart },
  kanban: { label: "Kanban", jp: "看板", icon: Kanban },
  calendar: { label: "Takvim", jp: "暦", icon: Calendar },
};
const ALL_VIEW_KEYS: ViewKey[] = ["notes", "table", "gantt", "kanban", "calendar"];

export type Section = "project" | "backlog" | "trash" | "journal" | "habits" | "retreat" | "notebook";

type Props = {
  projects: Project[];
  selectedId: string | null;
  selectedView: ViewKey;
  section: Section;
  selectedNotebookId: string | null;
  selectedKnowledgeNoteId: string | null;
  onSelect: (id: string, view?: ViewKey) => void;
  onCreate: (name: string, parentId?: string) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string; icon?: string | null; icon_color?: string | null; enabled_views?: ViewKey[] }) => void;
  onSelectBacklog: () => void;
  onSelectTrash: () => void;
  onSelectJournal: () => void;
  onSelectHabits: () => void;
  onSelectRetreat: () => void;
  onSelectNotebook: (notebookId: string) => void;
  onSelectKnowledgeNote: (noteId: string | null) => void;
};

type ProjectWithKind = Project & {
  kind?: string;
};

export const ProjectIconPicker = ({
  icon,
  iconColor,
  onChange,
}: {
  icon: string | null;
  iconColor: string | null;
  onChange: (updates: { icon?: string | null; icon_color?: string | null }) => void;
}) => {
  const [search, setSearch] = useState("");
  const Current = getHabitIcon(icon || "folder");
  const tint = iconColor ? colorHex(iconColor) : undefined;
  const ql = search.trim().toLowerCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-sm hover:bg-accent/40 transition-colors"
          title="İkon değiştir"
        >
          <Current className="h-4 w-4" strokeWidth={1.5} style={{ color: tint }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 max-h-[60vh] overflow-y-auto" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1 px-1">Renk</div>
        <div className="flex flex-wrap gap-1 mb-2 px-1">
          {CATEGORY_COLORS.map((c) => {
            const active = c.key === iconColor;
            return (
              <button
                key={c.key}
                onClick={() => onChange({ icon_color: c.key })}
                title={c.label}
                className="w-5 h-5 rounded-full flex items-center justify-center border border-border/40 transition-transform hover:scale-110"
                style={{ background: c.hex }}
              >
                {active && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İkon ara..."
          className="h-8 text-xs mb-2"
        />
        {HABIT_ICON_GROUPS.map((g) => {
          const filtered = ql
            ? g.icons.filter((i) => i.label.toLowerCase().includes(ql) || i.name.includes(ql))
            : g.icons;
          if (filtered.length === 0) return null;
          return (
            <div key={g.label} className="mb-2">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1 px-1">{g.label}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {filtered.map((i) => {
                  const Icon = i.icon;
                  const active = i.name === icon;
                  return (
                    <button
                      key={i.name}
                      onClick={() => onChange({ icon: i.name, icon_color: iconColor || "stone" })}
                      title={i.label}
                      className={`flex items-center justify-center w-8 h-8 rounded-sm transition-colors ${
                        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                      style={active && tint ? { color: tint } : undefined}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

const ProjectItem = ({
  project,
  children,
  selectedId,
  selectedView,
  section,
  onSelect,
  onDelete,
  onUpdateProject,
  onAddSub,
  depth = 0,
}: {
  project: Project;
  children: Project[];
  selectedId: string | null;
  selectedView: ViewKey;
  section: Section;
  onSelect: (id: string, view?: ViewKey) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string; icon?: string | null; icon_color?: string | null; enabled_views?: ViewKey[] }) => void;
  onAddSub: (parentId: string) => void;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const isSelected = section === "project" && selectedId === project.id;
  const projectViews = project.enabled_views || ["notes", "table"];
  const availableToAdd = ALL_VIEW_KEYS.filter((v) => !projectViews.includes(v));

  const commitRename = () => {
    const v = renameValue.trim();
    if (v && v !== project.name) onUpdateProject(project.id, { name: v });
    setRenaming(false);
  };

  const handleProjectClick = () => {
    if (renaming) return;
    onSelect(project.id);
    setExpanded(true);
  };

  const addView = (v: ViewKey) => onUpdateProject(project.id, { enabled_views: [...projectViews, v] });
  const removeView = (v: ViewKey) => onUpdateProject(project.id, { enabled_views: projectViews.filter((x) => x !== v) });
  const moveView = (v: ViewKey, dir: -1 | 1) => {
    const idx = projectViews.indexOf(v);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= projectViews.length) return;
    const reordered = [...projectViews];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    onUpdateProject(project.id, { enabled_views: reordered });
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleProjectClick}
          className={`group/item text-sm font-light ${isSelected ? "bg-accent text-accent-foreground" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 mr-0.5"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
          <ProjectIconPicker
            
            icon={project.icon}
            iconColor={project.icon_color}
            onChange={(updates) => onUpdateProject(project.id, updates)}
          />
          {renaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenameValue(project.name); setRenaming(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="h-6 ml-1.5 text-xs bg-transparent px-1 py-0 flex-1"
            />
          ) : (
            <span
              className="truncate flex-1 ml-1.5"
              onDoubleClick={(e) => { e.stopPropagation(); setRenameValue(project.name); setRenaming(true); }}
            >
              {project.name}
            </span>
          )}
          <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setRenameValue(project.name); setRenaming(true); }} className="text-muted-foreground hover:text-foreground" title="Yeniden adlandır">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAddSub(project.id); }} className="text-muted-foreground hover:text-foreground" title="Alt proje">
              <Plus className="h-3 w-3" />
            </button>
            {!project.is_default && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-muted-foreground hover:text-destructive" title="Sil">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Alt sayfalar (görünümler) */}
      {expanded && projectViews.map((vk, idx) => {
        const meta = VIEW_META[vk];
        const Icon = meta.icon;
        const active = isSelected && selectedView === vk;
        const isFirst = idx === 0;
        const isLast = idx === projectViews.length - 1;
        return (
          <SidebarMenuItem key={vk}>
            <SidebarMenuButton
              onClick={() => onSelect(project.id, vk)}
              className={`text-xs font-light group/view ${active ? "bg-accent/60 text-accent-foreground" : "text-muted-foreground"}`}
              style={{ paddingLeft: `${8 + (depth + 1) * 16 + 12}px` }}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{meta.label}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover/view:opacity-100 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); moveView(vk, -1); }}
                  disabled={isFirst}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground"
                  title="Yukarı taşı"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveView(vk, 1); }}
                  disabled={isLast}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground"
                  title="Aşağı taşı"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {vk !== "notes" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeView(vk); }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Bu görünümü kaldır"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}

      {/* Görünüm ekle */}
      {expanded && availableToAdd.length > 0 && (
        <SidebarMenuItem>
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                className="text-[10px] text-muted-foreground/70 font-light"
                style={{ paddingLeft: `${8 + (depth + 1) * 16 + 12}px` }}
              >
                <Plus className="h-3 w-3" />
                <span>Görünüm ekle</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {availableToAdd.map((vk) => {
                const meta = VIEW_META[vk];
                const Icon = meta.icon;
                return (
                  <button
                    key={vk}
                    onClick={() => addView(vk)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{meta.label}</span>
                    <span className="text-muted-foreground/60 ml-auto text-[9px]">{meta.jp}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      )}

      {/* Alt projeler */}
      {expanded && children.map((child) => (
        <ProjectItem
          key={child.id}
          project={child}
          children={[]}
          selectedId={selectedId}
          selectedView={selectedView}
          section={section}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdateProject={onUpdateProject}
          onAddSub={onAddSub}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

const AppSidebar = ({ projects, selectedId, selectedView, section, selectedNotebookId, selectedKnowledgeNoteId, onSelect, onCreate, onDelete, onUpdateProject, onSelectBacklog, onSelectTrash, onSelectJournal, onSelectHabits, onSelectRetreat, onSelectNotebook, onSelectKnowledgeNote }: Props) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { prefs, setItem } = useSidebarPreferences();
  const { get: moduleLabel } = useModuleLabels();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newModuleOpen, setNewModuleOpen] = useState(false);

  const MODULE_OPTIONS: { key: "backlog" | "journal" | "habits" | "workHistory" | "pomodoro" | "retreat"; label: string; icon: LucideIcon }[] = [
    { key: "backlog", label: moduleLabel("backlog"), icon: Package },
    { key: "journal", label: moduleLabel("journal"), icon: FileText },
    { key: "habits", label: moduleLabel("habits"), icon: Repeat },
    { key: "workHistory", label: moduleLabel("workHistory"), icon: Clock },
    { key: "pomodoro", label: moduleLabel("pomodoro"), icon: Clock },
    { key: "retreat", label: moduleLabel("retreat"), icon: Wind },
  ];
  const hiddenModules = MODULE_OPTIONS.filter((m) => !prefs[m.key]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), undefined);
    setNewName("");
    setShowInput(false);
  };

  const handleAddSub = (parentId: string) => {
    setAddingParentId(parentId);
    setSubName("");
  };

  const handleCreateSub = () => {
    if (!subName.trim() || !addingParentId) return;
    onCreate(subName.trim(), addingParentId);
    setSubName("");
    setAddingParentId(null);
  };

  const projectKind = (p: Project) => (p as ProjectWithKind).kind || "project";
  const rootProjects = projects.filter((p) => !p.parent_id && projectKind(p) === "project");
  const getChildren = (parentId: string) => projects.filter((p) => p.parent_id === parentId);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/60">
      <SidebarContent>
        {/* Heybe */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {prefs.backlog && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={onSelectBacklog}
                    className={`text-sm font-light ${section === "backlog" ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span className="tracking-wide">{moduleLabel("backlog")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {prefs.journal && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={onSelectJournal}
                    className={`text-sm font-light ${section === "journal" ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="tracking-wide">{moduleLabel("journal")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {prefs.habits && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={onSelectHabits}
                    className={`text-sm font-light ${section === "habits" ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span className="tracking-wide">{moduleLabel("habits")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {prefs.workHistory && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/work-history")}
                    className="text-sm font-light"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span className="tracking-wide">{moduleLabel("workHistory")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {prefs.retreat && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={onSelectRetreat}
                    className={`text-sm font-light ${section === "retreat" ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <Wind className="h-3.5 w-3.5" />
                    <span className="tracking-wide">{moduleLabel("retreat")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <Popover open={newModuleOpen} onOpenChange={setNewModuleOpen}>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton className="text-xs text-muted-foreground/70 font-light">
                      <Plus className="h-3 w-3" />
                      <span className="tracking-wide">Yeni Modül</span>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1" align="start">
                    {hiddenModules.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground/70 font-light px-2 py-2 text-center">
                        Tüm modüller eklendi
                      </div>
                    ) : (
                      hiddenModules.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.key}
                            onClick={() => { setItem(m.key, true); setNewModuleOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors text-left"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="tracking-wide">{m.label}</span>
                          </button>
                        );
                      })
                    )}
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            計画 Projeler
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootProjects.map((project) => (
                <div key={project.id}>
                  <ProjectItem
                    project={project}
                    children={getChildren(project.id)}
                    selectedId={selectedId}
                    selectedView={selectedView}
                    section={section}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onUpdateProject={onUpdateProject}
                    onAddSub={handleAddSub}
                  />
                  {addingParentId === project.id && (
                    <SidebarMenuItem>
                      <div className="flex gap-1 px-2 py-1" style={{ paddingLeft: "32px" }}>
                        <Input
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateSub();
                            if (e.key === "Escape") setAddingParentId(null);
                          }}
                          autoFocus
                          placeholder="Alt proje adı..."
                          className="h-7 text-xs bg-transparent"
                        />
                      </div>
                    </SidebarMenuItem>
                  )}
                </div>
              ))}

              {showInput ? (
                <SidebarMenuItem>
                  <div className="flex gap-1 px-2 py-1">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") setShowInput(false);
                      }}
                      autoFocus
                      placeholder="Proje adı..."
                      className="h-7 text-xs bg-transparent"
                    />
                  </div>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowInput(true)} className="text-xs text-muted-foreground">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Yeni Proje
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bilgi Merkezi */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            知 Bilgi Merkezi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NotebookSidebarTree
              selectedNotebookId={section === "notebook" ? selectedNotebookId : null}
              selectedKnowledgeNoteId={section === "notebook" ? selectedKnowledgeNoteId : null}
              onSelectNotebook={onSelectNotebook}
              onSelectKnowledgeNote={onSelectKnowledgeNote}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pomodoro + Çöp kutusu */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {prefs.pomodoro && <PomodoroSidebarWidget />}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onSelectTrash}
                  className={`text-xs font-light ${section === "trash" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  <Trash className="h-3 w-3" />
                  <span className="tracking-wide">Çöp Kutusu</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSettingsOpen(true)}
                  className="text-xs font-light text-muted-foreground"
                >
                  <Settings className="h-3 w-3" />
                  <span className="tracking-wide">Ayarlar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {user?.email}
          </span>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
};

export default AppSidebar;
