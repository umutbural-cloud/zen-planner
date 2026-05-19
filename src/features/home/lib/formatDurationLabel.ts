export const formatDurationLabel = (totalMinutes: number) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} Dakika`;
  if (remainingMinutes === 0) return `${hours} Saat`;
  return `${hours} Saat ${remainingMinutes} Dakika`;
};
