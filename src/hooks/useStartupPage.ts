import { useUserSettings, type StartupPageSetting } from "@/hooks/useUserSettings";

export type StartupPage = StartupPageSetting;

export const useStartupPage = () => {
  const { settings, update } = useUserSettings();
  const startup: StartupPage = settings.startup_page ?? { type: "default" };

  const setStartup = (next: StartupPage) => {
    update({ startup_page: next });
  };

  return { startup, setStartup };
};
