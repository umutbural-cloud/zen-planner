import { createContext, useContext, useState, ReactNode } from "react";
import { format } from "date-fns";
import type { Section } from "@/components/AppSidebar";
import type { ViewKey } from "@/hooks/useProjectViews";

type PageState = {
  section: Section;
  selectedProjectId: string | null;
  view: ViewKey;
  journalDate: string;
  selectedNotebookId: string | null;
  selectedKnowledgeNoteId: string | null;
  setSection: (s: Section) => void;
  setSelectedProjectId: (id: string | null) => void;
  setView: (v: ViewKey) => void;
  setJournalDate: (d: string) => void;
  setSelectedNotebookId: (id: string | null) => void;
  setSelectedKnowledgeNoteId: (id: string | null) => void;
};

const Ctx = createContext<PageState | null>(null);

export const PageStateProvider = ({ children }: { children: ReactNode }) => {
  const [section, setSection] = useState<Section>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("table");
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedKnowledgeNoteId, setSelectedKnowledgeNoteId] = useState<string | null>(null);
  const [journalDate, setJournalDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  return (
    <Ctx.Provider value={{ section, selectedProjectId, view, journalDate, selectedNotebookId, selectedKnowledgeNoteId, setSection, setSelectedProjectId, setView, setJournalDate, setSelectedNotebookId, setSelectedKnowledgeNoteId }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePageState = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePageState must be used within PageStateProvider");
  return c;
};
