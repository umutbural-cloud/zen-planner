const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
});

const formatTime = (date: Date) => timeFormatter.format(date);

export const formatLastSeenWindow = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const start = new Date(date);
  start.setSeconds(0, 0);
  start.setMinutes(date.getMinutes() < 30 ? 0 : 30);

  const end = new Date(start);
  end.setMinutes(start.getMinutes() + 30);

  return `${dateFormatter.format(start)} · ${formatTime(start)}–${formatTime(end)}`;
};
