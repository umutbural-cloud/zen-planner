import { useState } from "react";
import { Plus, Trash2, Pencil, ChevronRight, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useNotebooks } from "../hooks/useNotebooks";
import type { Notebook } from "../types";

type Props = {
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string) => void;
};

const NotebookRow = ({
  notebook, children, depth, selectedNotebookId, onSelectNotebook, onUpdate, onDelete, onAddSub,
}: {
  notebook: Notebook;
  children: Notebook[];
  depth: number;
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string) => void;
  onUpdate: (id: string, u: Partial<Notebook>) => void;
  onDelete: (id: string) => void;
  onAddSub: (parentId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(notebook.name);
  const isSelected = selectedNotebookId === notebook.id;
  const hasChildren = children.length > 0;

  const commit = () => {
    const v = name.trim();
    if (v && v !== notebook.name) onUpdate(notebook.id, { name: v });
    setRenaming(false);
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => { if (!renaming) onSelectNotebook(notebook.id); }}
          className={`group/nb text-sm font-light ${isSelected ? "bg-accent text-accent-foreground" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} className="shrink-0 mr-0.5">
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : <span className="w-3 mr-0.5" />}
          <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-80" />
          {renaming ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setName(notebook.name); setRenaming(false); } }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="h-6 ml-1.5 text-xs bg-transparent px-1 py-0 flex-1"
            />
          ) : (
            <span className="truncate flex-1 ml-1.5"
              onDoubleClick={(e) => { e.stopPropagation(); setName(notebook.name); setRenaming(true); }}>
              {notebook.name}
            </span>
          )}
          <div className="flex gap-0.5 opacity-0 group-hover/nb:opacity-100 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setName(notebook.name); setRenaming(true); }} className="text-muted-foreground hover:text-foreground" title="Yeniden adlandır">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAddSub(notebook.id); }} className="text-muted-foreground hover:text-foreground" title="Alt defter">
              <Plus className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(notebook.id); }} className="text-muted-foreground hover:text-destructive" title="Sil">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {expanded && children.map((c) => (
        <NotebookRow key={c.id} notebook={c} children={[]} depth={depth + 1}
          selectedNotebookId={selectedNotebookId} onSelectNotebook={onSelectNotebook}
          onUpdate={onUpdate} onDelete={onDelete} onAddSub={onAddSub} />
      ))}
    </>
  );
};

const NotebookSidebarTree = ({ selectedNotebookId, onSelectNotebook }: Props) => {
  const { notebooks, createNotebook, updateNotebook, deleteNotebook } = useNotebooks();
  const [showRoot, setShowRoot] = useState(false);
  const [newName, setNewName] = useState("");
  const [subParent, setSubParent] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  const roots = notebooks.filter((n) => !n.parent_id);
  const childOf = (id: string) => notebooks.filter((n) => n.parent_id === id);

  const createRoot = async () => {
    const v = newName.trim();
    if (!v) return;
    const nb = await createNotebook(v);
    setNewName(""); setShowRoot(false);
    if (nb) onSelectNotebook(nb.id);
  };

  const createSub = async () => {
    if (!subParent) return;
    const v = subName.trim();
    if (!v) return;
    const nb = await createNotebook(v, subParent);
    setSubName(""); setSubParent(null);
    if (nb) onSelectNotebook(nb.id);
  };

  return (
    <SidebarMenu>
      {roots.map((nb) => (
        <div key={nb.id}>
          <NotebookRow
            notebook={nb}
            children={childOf(nb.id)}
            depth={0}
            selectedNotebookId={selectedNotebookId}
            onSelectNotebook={onSelectNotebook}
            onUpdate={updateNotebook}
            onDelete={deleteNotebook}
            onAddSub={(pid) => { setSubParent(pid); setSubName(""); }}
          />
          {subParent === nb.id && (
            <SidebarMenuItem>
              <div className="flex gap-1 px-2 py-1" style={{ paddingLeft: "32px" }}>
                <Input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createSub(); if (e.key === "Escape") setSubParent(null); }}
                  autoFocus
                  placeholder="Alt defter adı..."
                  className="h-7 text-xs bg-transparent"
                />
              </div>
            </SidebarMenuItem>
          )}
        </div>
      ))}

      {showRoot ? (
        <SidebarMenuItem>
          <div className="flex gap-1 px-2 py-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createRoot(); if (e.key === "Escape") setShowRoot(false); }}
              autoFocus
              placeholder="Defter adı..."
              className="h-7 text-xs bg-transparent"
            />
          </div>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => setShowRoot(true)} className="text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Yeni Defter
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
};

export default NotebookSidebarTree;
