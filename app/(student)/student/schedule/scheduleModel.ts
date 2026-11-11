import { SCHOOL_TIME_ZONE } from "@/lib/utils/schoolTime";
import type { StudentPracticeSlot } from "@/types";

export const SCHOOL_ZONE = SCHOOL_TIME_ZONE;
export const dateLabel = (value: string | number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-EC", { timeZone: SCHOOL_ZONE, ...options }).format(new Date(value));
export const timeLabel = (value: string | number) =>
  dateLabel(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function dayKey(value: string | number): string {
  const parts = new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const dayInstant = (key: string) => Date.parse(`${key}T12:00:00-05:00`);
export const addDays = (key: string, count: number) => dayKey(dayInstant(key) + count * 86400000);
export const slotEnd = (slot: Pick<StudentPracticeSlot, "scheduledAt" | "durationMinutes">) =>
  Date.parse(slot.scheduledAt) + slot.durationMinutes * 60000;
export const isActive = (slot: StudentPracticeSlot) =>
  slot.status === "asignado" || slot.status === "confirmado";
export const hoursLabel = (minutes: number) =>
  `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(minutes / 60)} h`;
export const titleCase = (name: string) =>
  name
    .toLocaleLowerCase("es-EC")
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es-EC"));
export const instructorName = (slot: StudentPracticeSlot) =>
  "instructorName" in slot && slot.instructorName
    ? titleCase(slot.instructorName)
    : "Instructor por informar";
export function relativeDay(value: string | number, now: number | null): string {
  if (now === null) return "";
  const key = dayKey(value);
  return key === dayKey(now) ? "Hoy" : key === addDays(dayKey(now), 1) ? "Mañana" : "";
}

export type VisualState = {
  label: string;
  tone: "neutral" | "info" | "success" | "complete" | "warning" | "error" | "live";
  icon: "check" | "clock" | "cross";
  cancelled?: boolean;
};
export function visualState(slot: StudentPracticeSlot, now: number | null): VisualState {
  if (slot.attended === true) return { label: "Asistió", tone: "complete", icon: "check" };
  if (slot.attended === false) return { label: "No asistió", tone: "error", icon: "cross" };
  if (isActive(slot) && now !== null && Date.parse(slot.scheduledAt) <= now && slotEnd(slot) > now)
    return { label: "En curso", tone: "live", icon: "clock" };
  switch (slot.status) {
    case "confirmado":
      return { label: "Confirmada", tone: "success", icon: "check" };
    case "completado":
      return { label: "Completada · asistencia pendiente", tone: "complete", icon: "clock" };
    case "sin_practica":
      return { label: "Sin práctica", tone: "neutral", icon: "cross", cancelled: true };
    case "liberado":
      return { label: "Liberada", tone: "warning", icon: "clock" };
    case "disponible":
      return { label: "Disponible", tone: "info", icon: "clock" };
    default:
      return { label: "Asignado", tone: "info", icon: "clock" };
  }
}

export interface PracticeBlock {
  id: string;
  day: string;
  slots: StudentPracticeSlot[];
  start: number;
  end: number;
}
export function groupSlots(slots: StudentPracticeSlot[]): PracticeBlock[] {
  const blocks: PracticeBlock[] = [];
  for (const slot of [...slots].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  )) {
    const previous = blocks.at(-1);
    const instructor = "instructorId" in slot ? slot.instructorId : null;
    const last = previous?.slots.at(-1);
    const sameInstructor =
      last && instructor !== null && "instructorId" in last && last.instructorId === instructor;
    if (
      previous &&
      previous.day === dayKey(slot.scheduledAt) &&
      previous.end === Date.parse(slot.scheduledAt) &&
      sameInstructor
    ) {
      previous.slots.push(slot);
      previous.end = slotEnd(slot);
    } else
      blocks.push({
        id: slot.id,
        day: dayKey(slot.scheduledAt),
        slots: [slot],
        start: Date.parse(slot.scheduledAt),
        end: slotEnd(slot),
      });
  }
  return blocks;
}

// These are configuration failures from the existing RPCs, not empty schedules.
export const isPlanConfigurationError = (message: string | null) =>
  Boolean(
    message &&
    /matrícula.*(?:horas objetivo|fecha fin|modalidad)|fecha fin de prácticas.*inválida/i.test(
      message,
    ),
  );
export function friendlyError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (isPlanConfigurationError(message))
    return "La escuela está terminando de configurar tu plan. Por ahora no se puede cambiar este horario.";
  if (
    /reprogramaciones|Otro alumno|ya no está disponible|5 minutos|no puedes|no tienes|práctica.*(?:válida|futura)/i.test(
      message,
    )
  )
    return message;
  return fallback;
}

// UTC instants preserve Guayaquil's UTC-5 times in calendars in every timezone.
export function downloadCalendar(blocks: PracticeBlock[]): void {
  const stamp = (instant: number) =>
    new Date(instant)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const escape = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Colorados Drive//Mis practicas//ES",
    "CALSCALE:GREGORIAN",
    "X-WR-TIMEZONE:America/Guayaquil",
  ];
  for (const block of blocks)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${block.id}@coloradosdrive`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(block.start)}`,
      `DTEND:${stamp(block.end)}`,
      "SUMMARY:Práctica de conducción – Colorados Drive",
      `DESCRIPTION:${escape(`Instructor: ${instructorName(block.slots[0])}. Horario de la escuela: America/Guayaquil (UTC-5).`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Tu práctica empieza en 30 minutos",
      "END:VALARM",
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  // RFC 5545: fold at 75 octets without splitting a Unicode code point.
  const folded =
    lines
      .map((line) => {
        let result = "",
          length = 0;
        for (const char of line) {
          const size = new TextEncoder().encode(char).length;
          if (length + size > 75) {
            result += "\r\n ";
            length = 1;
          }
          result += char;
          length += size;
        }
        return result;
      })
      .join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([folded], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "mis-practicas-colorados-drive.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
