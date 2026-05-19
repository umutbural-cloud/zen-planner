export const getLocalDayRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
};

export const formatSessionEndTime = (date: Date) =>
  date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
