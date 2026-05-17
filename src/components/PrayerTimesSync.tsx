import { usePrayerTimes } from "@/hooks/usePrayerTimes";

/**
 * Headless component that keeps the auto-prayer-time starts in sync with
 * the user's location/city settings. Mount once at the top of the app.
 */
export const PrayerTimesSync = () => {
  usePrayerTimes();
  return null;
};

export default PrayerTimesSync;
