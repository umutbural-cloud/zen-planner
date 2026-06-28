import HomeHabitsPreview from "@/features/home/components/HomeHabitsPreview";
import HomeHero from "@/features/home/components/HomeHero";
import HomeMetrics from "@/features/home/components/HomeMetrics";
import HomePlanPreview from "@/features/home/components/HomePlanPreview";
import HomePomodoroPreview from "@/features/home/components/HomePomodoroPreview";
import HomeQuickActions from "@/features/home/components/HomeQuickActions";
import HomeRecentWorkPreview from "@/features/home/components/HomeRecentWorkPreview";
import { useDailyFocus } from "@/features/home/hooks/useDailyFocus";
import { useHomeDashboardData } from "@/features/home/hooks/useHomeDashboardData";
import { useHomeQuickActionsNavigation } from "@/features/home/hooks/useHomeQuickActionsNavigation";

const HomeView = () => {
  const dashboard = useHomeDashboardData();
  const { selectedFocus, selectedFocusOption, focusOptions, setSelectedFocus } = useDailyFocus();
  const { openJournal, openHabits, openRetreat, openQuickNotes } = useHomeQuickActionsNavigation();

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-5">
      <HomeHero
        name={dashboard.userName}
        greetingLabel={dashboard.greetingLabel}
        dateLabel={dashboard.dateLabel}
        selectedFocus={selectedFocus}
        selectedFocusOption={selectedFocusOption}
        focusOptions={focusOptions}
        onSelectFocus={setSelectedFocus}
      />

      <HomeMetrics metrics={dashboard.metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-5">
        <div className="space-y-6 lg:col-span-2 lg:space-y-5">
          <HomePlanPreview plan={dashboard.plan} study={dashboard.study} />
          <HomeQuickActions
            onOpenJournal={openJournal}
            onOpenHabits={openHabits}
            onOpenRetreat={openRetreat}
            onOpenQuickNotes={() => {
              void openQuickNotes();
            }}
          />
        </div>
        <div className="space-y-6 lg:space-y-5">
          <HomePomodoroPreview pomodoro={dashboard.pomodoro} />
          <HomeRecentWorkPreview recentWork={dashboard.recentWork} />
          <HomeHabitsPreview
            habits={dashboard.habits}
            defaultFilter={dashboard.habitsDefaultFilter}
            onToggleHabit={dashboard.toggleHabit}
          />
        </div>
      </div>
    </div>
  );
};

export default HomeView;
