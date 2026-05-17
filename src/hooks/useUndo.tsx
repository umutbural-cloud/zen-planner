import { createContext, useContext, useRef, useState, useCallback, ReactNode } from "react";

export type UndoAction = {
  label: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
};

type UndoContextType = {
  push: (action: UndoAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const UndoContext = createContext<UndoContextType | null>(null);

const MAX = 100;

export const UndoProvider = ({ children }: { children: ReactNode }) => {
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const push = useCallback((action: UndoAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX) undoStack.current.shift();
    redoStack.current = [];
    refresh();
  }, []);

  const undo = useCallback(async () => {
    const a = undoStack.current.pop();
    if (!a) return;
    await a.undo();
    redoStack.current.push(a);
    refresh();
  }, []);

  const redo = useCallback(async () => {
    const a = redoStack.current.pop();
    if (!a) return;
    await a.redo();
    undoStack.current.push(a);
    refresh();
  }, []);

  return (
    <UndoContext.Provider value={{
      push, undo, redo,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    }}>
      {children}
    </UndoContext.Provider>
  );
};

export const useUndo = () => {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within UndoProvider");
  return ctx;
};
