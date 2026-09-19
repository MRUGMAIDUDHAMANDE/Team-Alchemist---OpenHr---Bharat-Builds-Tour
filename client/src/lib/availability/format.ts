const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatSlotWindow(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${dayFormat.format(start)}, ${timeFormat.format(start)} – ${timeFormat.format(end)}`;
  }
  return `${dateTimeFormat.format(start)} – ${dateTimeFormat.format(end)}`;
}
