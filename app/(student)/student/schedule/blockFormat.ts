import { SCHOOL_TIME_ZONE } from "@/lib/utils/schoolTime";

const capital = (text: string) => text.charAt(0).toLocaleUpperCase("es-EC") + text.slice(1);
// "Jueves 3 de diciembre", en la hora de la escuela.
export const blockDate = (value: string) => {
  const parts = new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return capital(`${part("weekday")} ${part("day")} de ${part("month")}`);
};
export const blockTime = (value: string) =>
  new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
export const localDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const blockEnd = (value: string, hours: number) =>
  new Date(Date.parse(value) + hours * 3600000).toISOString();
