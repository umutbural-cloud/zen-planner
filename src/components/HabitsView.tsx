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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Alışkanlıklar</div>
        <h1 className="text-2xl font-light tracking-wide">Alışkanlıklar</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-border/60">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-baseline gap-2 px-3 py-2 -mb-px border-b transition-colors ${
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
