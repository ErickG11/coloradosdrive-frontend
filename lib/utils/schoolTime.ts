import { addWeeks, dayKey, startOfWeek } from "@/lib/utils/calendar";

// La zona horaria de la escuela se define en el backend:
// coloradosdrive-backend-git/src/utils/schoolTimezone.ts.
export const SCHOOL_TIME_ZONE = "America/Guayaquil";

export function formatPracticeDateTime(iso: string, includeYear = false): string {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" as const, hour12: false } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Fecha civil de la escuela para las utilidades de calendario locales.
// El resultado representa un día de calendario, no el instante original.
export function schoolCalendarDate(instant: Date): Date {
  const parts = calendarDateFormatter.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}

// Día de la escuela (AAAA-MM-DD) en el que cae un instante; null si no es válido.
export function schoolDateKey(iso: string): string | null {
  const instant = new Date(iso);
  return Number.isNaN(instant.getTime()) ? null : dayKey(schoolCalendarDate(instant));
}

// Convierte AAAA-MM-DD en fecha civil; null si no es una fecha real (2026-02-30).
export function parseSchoolDateKey(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === value ? date : null;
}

// Guayaquil permanece en UTC-5. Convertimos las fechas civiles de cada lunes
// a instantes sin depender de la zona horaria del navegador.
export function schoolWeekRange(date: Date): { from: string; to: string } {
  const monday = startOfWeek(date);
  const nextMonday = addWeeks(monday, 1);
  const atMidnight = (day: Date) =>
    new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 5)).toISOString();
  return { from: atMidnight(monday), to: atMidnight(nextMonday) };
}

export function formatSchoolTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
