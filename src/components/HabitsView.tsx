import { useState } from "react";
import HabitsToday from "./HabitsToday";
import HabitsBoard from "./HabitsBoard";
import HabitsStats from "./HabitsStats";

type Tab = "today" | "master" | "stats";

const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Bugün" },
  { key: "master", label: "Master" },
  { key: "stats", label: "İstatistik" },
];

const HabitsView = () => {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="mx-auto max-w-3xl space-y-3 md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-[2rem] font-light leading-tight tracking-[-0.03em] md:text-2xl md:tracking-wide">Alışkanlıklar</h1>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 pb-1 md:pb-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex min-h-12 shrink-0 items-baseline gap-2 border-b-2 px-4 py-3 transition-colors md:min-h-0 md:border-b md:px-3 md:py-2 ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-sm font-light tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "today" && <HabitsToday />}
      {tab === "master" && <HabitsBoard />}
      {tab === "stats" && <HabitsStats />}
    </div>
  );
};

export default HabitsView;
