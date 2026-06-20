import { Clock3 } from "lucide-react";
import type { HomeRecentWorkItem, HomeSectionState } from "@/features/home/types";

type Props = {
  recentWork: HomeSectionState<HomeRecentWorkItem[]>;
};

const HomeRecentWorkPreview = ({ recentWork }: Props) => {
  const items = recentWork.data.slice(0, 3);

  return (
    <section className="rounded-sm border border-border/60 bg-transparent overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-light tracking-wide">Son Çalışmalar</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </header>

      {recentWork.status === "loading" && <div className="mx-4 mb-4 h-24 rounded-sm border border-border/60 bg-transparent animate-pulse" />}
      {recentWork.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{recentWork.error || "Son çalışmalar yüklenemedi."}</div>}
      {(recentWork.status === "empty" || items.length === 0) && <div className="px-5 pb-5 text-xs text-muted-foreground">Henüz tamamlanan çalışma yok.</div>}
      {recentWork.status === "ready" && items.length > 0 && (
        <ul className="px-2 pb-2 divide-y divide-border/40">
          {items.map((item) => (
          <li key={item.id} className="px-3 py-2 rounded-sm hover:bg-accent/20 transition-colors">
              <div className="text-sm tracking-wide text-foreground truncate">{item.name}</div>
              <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>{item.durationLabel}</span>
                <span className="tabular-nums">{item.endedAtLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default HomeRecentWorkPreview;
