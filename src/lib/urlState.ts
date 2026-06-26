export const URL_STATE_PARAMS = {
  task: "task",
  habit: "habit",
  note: "note",
} as const;

export type UrlStateParamKey = keyof typeof URL_STATE_PARAMS;

export type PrimaryNavigationKey =
  | "home"
  | "project"
  | "journal"
  | "habits"
  | "pomodoro"
  | "workHistory"
  | "backlog"
  | "trash"
  | "retreat"
  | "notebook";

type SectionLike = Exclude<PrimaryNavigationKey, "pomodoro" | "workHistory">;

const cloneSearchParams = (searchParams: URLSearchParams) => new URLSearchParams(searchParams);

export const getUrlStateParam = (searchParams: URLSearchParams, key: UrlStateParamKey) => {
  const value = searchParams.get(URL_STATE_PARAMS[key]);
  return value && value.trim() ? value : null;
};

export const setUrlStateParam = (searchParams: URLSearchParams, key: UrlStateParamKey, id: string) => {
  const next = cloneSearchParams(searchParams);
  const value = id.trim();
  if (value) next.set(URL_STATE_PARAMS[key], value);
  else next.delete(URL_STATE_PARAMS[key]);
  return next;
};

export const clearUrlStateParam = (searchParams: URLSearchParams, key: UrlStateParamKey) => {
  const next = cloneSearchParams(searchParams);
  next.delete(URL_STATE_PARAMS[key]);
  return next;
};

export const getPrimaryNavigationKey = (pathname: string, section: SectionLike): PrimaryNavigationKey => {
  if (pathname === "/pomodoro") return "pomodoro";
  if (pathname === "/work-history") return "workHistory";
  if (pathname === "/habits") return "habits";
  if (pathname === "/journal") return "journal";
  return section;
};
