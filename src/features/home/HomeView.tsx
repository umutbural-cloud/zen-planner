import HomeDayClose from "@/features/home/components/HomeDayClose";
import HomeHabitsPreview from "@/features/home/components/HomeHabitsPreview";
import HomeHero from "@/features/home/components/HomeHero";
import HomeMetrics from "@/features/home/components/HomeMetrics";
import HomeNotesPreview from "@/features/home/components/HomeNotesPreview";
import HomePlanPreview from "@/features/home/components/HomePlanPreview";
import HomePomodoroPreview from "@/features/home/components/HomePomodoroPreview";
import HomeQuickActions from "@/features/home/components/HomeQuickActions";
import HomeRecentWorkPreview from "@/features/home/components/HomeRecentWorkPreview";
import { useDailyFocus } from "@/features/home/hooks/useDailyFocus";
import { useHomeDashboardData } from "@/features/home/hooks/useHomeDashboardData";
import { usePageState } from "@/hooks/usePageState";

const HomeView = () => {
  const dashboard = useHomeDashboardData();
  const { selectedFocus, focusOptions, setSelectedFocus } = useDailyFocus();
  const { setSection } = usePageState();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <HomeHero
        name={dashboard.userName}
        dateLabel={dashboard.dateLabel}
        selectedFocus={selectedFocus}
        focusOptions={focusOptions}
        onSelectFocus={setSelectedFocus}
      />

      <HomeMetrics metrics={dashboard.metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <HomePlanPreview plan={dashboard.plan} study={dashboard.study} />
          <HomeQuickActions
            onOpenJournal={() => setSection("journal")}
            onOpenHabits={() => setSection("habits")}
            onOpenRetreat={() => setSection("retreat")}
          />
        </div>
        <div className="space-y-5">
          <HomePomodoroPreview pomodoro={dashboard.pomodoro} />
          <HomeRecentWorkPreview recentWork={dashboard.recentWork} />
          <HomeHabitsPreview habits={dashboard.habits} />
          <HomeNotesPreview notes={dashboard.notes} />
        </div>
      </div>

      <HomeDayClose dayClose={dashboard.dayClose} />
    </div>
  );
};

export default HomeView;
