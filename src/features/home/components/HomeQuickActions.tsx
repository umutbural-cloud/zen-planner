import { BookOpen, Feather, Leaf, Repeat } from "lucide-react";
import type { ComponentType } from "react";

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick?: () => void;
};

type Props = {
  onOpenJournal: () => void;
  onOpenHabits: () => void;
  onOpenRetreat: () => void;
  onOpenQuickNotes: () => void;
};

const HomeQuickActions = ({ onOpenJournal, onOpenHabits, onOpenRetreat, onOpenQuickNotes }: Props) => {
  const actions: QuickAction[] = [
    { id: "journal", title: "Günlük", description: "Bugünün notunu aç", icon: BookOpen, onClick: onOpenJournal },
    { id: "habits", title: "Alışkanlıklar", description: "Rutinlerini kontrol et", icon: Repeat, onClick: onOpenHabits },
    { id: "retreat", title: "İnziva", description: "Sakinleşme alanı", icon: Leaf, onClick: onOpenRetreat },
    { id: "quick-note", title: "Not Al", description: "Hızlı not oluştur", icon: Feather, onClick: onOpenQuickNotes },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="rounded-sm border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-light tracking-wide text-foreground">{action.title}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{action.description}</p>
          </button>
        );
      })}
    </section>
  );
};

export default HomeQuickActions;
