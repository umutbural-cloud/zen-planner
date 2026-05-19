import { useCallback } from "react";
import { useNotebooks } from "@/features/knowledge/hooks/useNotebooks";
import { createQuickNotebook, getQuickNotebooks, QUICK_NOTEBOOK_ICON } from "@/features/quick-notes/lib/localQuickNotesStore";
import { usePageState } from "@/hooks/usePageState";

export const useHomeQuickActionsNavigation = () => {
  const { setSection, setSelectedNotebookId, setSelectedKnowledgeNoteId } = usePageState();
  const { notebooks, createNotebook } = useNotebooks();

  const openQuickNotes = useCallback(async () => {
    const existingNotebook = notebooks.find((notebook) => !notebook.deleted_at && notebook.icon !== QUICK_NOTEBOOK_ICON);
    const parentNotebook = existingNotebook || await createNotebook("Defterim");
    if (!parentNotebook) return;

    const quickNotebook = getQuickNotebooks(parentNotebook.id)[0] || createQuickNotebook(parentNotebook.id);
    setSelectedNotebookId(quickNotebook.id);
    setSelectedKnowledgeNoteId(null);
    setSection("notebook");
  }, [createNotebook, notebooks, setSection, setSelectedKnowledgeNoteId, setSelectedNotebookId]);

  return {
    openJournal: () => setSection("journal"),
    openHabits: () => setSection("habits"),
    openRetreat: () => setSection("retreat"),
    openQuickNotes,
  };
};
