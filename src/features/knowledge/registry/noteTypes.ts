import { ComponentType } from "react";
import { StickyNote, FileText } from "lucide-react";
import type { NoteType } from "../types";
import QuickNotesPanel from "../components/QuickNotesPanel";
import RichNotesPanel from "../components/RichNotesPanel";

export type NoteTypeDef = {
  key: NoteType;
  label: string;
  jp: string;
  icon: ComponentType<{ className?: string }>;
  Panel: ComponentType<{ notebookId: string }>;
};

export const NOTE_TYPES: NoteTypeDef[] = [
  { key: "quick", label: "Anlık Notlar", jp: "Anlık", icon: StickyNote, Panel: QuickNotesPanel },
  { key: "rich",  label: "Zengin Doküman", jp: "Doküman", icon: FileText, Panel: RichNotesPanel },
];
