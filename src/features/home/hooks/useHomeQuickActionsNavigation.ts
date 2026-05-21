import { useCallback } from "react";
import { QUICK_NOTES_ROOT_ID } from "@/features/quick-notes/lib/localQuickNotesStore";
import { usePageState } from "@/hooks/usePageState";

export const useHomeQuickActionsNavigation = () => {
  const { setSection, setSelectedNotebookId, setSelectedKnowledgeNoteId } = usePageState();

  const openQuickNotes = useCallback(async () => {
    setSelectedNotebookId(QUICK_NOTES_ROOT_ID);
    setSelectedKnowledgeNoteId(null);
    setSection("notebook");
  }, [setSection, setSelectedKnowledgeNoteId, setSelectedNotebookId]);

  return {
    openJournal: () => setSection("journal"),
    openHabits: () => setSection("habits"),
    openRetreat: () => setSection("retreat"),
    openQuickNotes,
  };
};
