export const blockDate = (value: string) =>
  new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
export const blockTime = (value: string) =>
  new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
export const localDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const blockEnd = (value: string, hours: number) =>
  new Date(Date.parse(value) + hours * 3600000).toISOString();
