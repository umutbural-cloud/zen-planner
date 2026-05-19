import HomeDayClose from "@/features/home/components/HomeDayClose";
import HomeHabitsPreview from "@/features/home/components/HomeHabitsPreview";
import HomeHero from "@/features/home/components/HomeHero";
import HomeMetrics from "@/features/home/components/HomeMetrics";
import HomeNotesPreview from "@/features/home/components/HomeNotesPreview";
import HomePlanPreview from "@/features/home/components/HomePlanPreview";
import HomePomodoroPreview from "@/features/home/components/HomePomodoroPreview";
import { useDailyFocus } from "@/features/home/hooks/useDailyFocus";
import { useHomeDashboardData } from "@/features/home/hooks/useHomeDashboardData";

const HomeView = () => {
  const dashboard = useHomeDashboardData();
  const { selectedFocus, focusOptions, setSelectedFocus } = useDailyFocus();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <HomeHero
        name={dashboard.userName}
        dateLabel={dashboard.dateLabel}
        campDayLabel={dashboard.campDayLabel}
        statusLabel={dashboard.statusLabel}
        streakDays={dashboard.streakDays}
        selectedFocus={selectedFocus}
        focusOptions={focusOptions}
        onSelectFocus={setSelectedFocus}
      />

      <HomeMetrics metrics={dashboard.metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <HomePlanPreview plan={dashboard.plan} study={dashboard.study} />
        </div>
        <div className="space-y-5">
          <HomePomodoroPreview pomodoro={dashboard.pomodoro} />
          <HomeHabitsPreview habits={dashboard.habits} />
          <HomeNotesPreview notes={dashboard.notes} />
        </div>
      </div>

      <HomeDayClose dayClose={dashboard.dayClose} />
    </div>
  );
};

export default HomeView;
