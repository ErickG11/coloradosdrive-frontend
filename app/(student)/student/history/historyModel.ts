import { SCHOOL_TIME_ZONE } from "@/lib/utils/schoolTime";
import type { PracticeHistoryItem } from "@/types/practiceAttendance";
import type { StudentPracticeSlot } from "@/types";

export const formatDate = (value: string | number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-EC", { timeZone: SCHOOL_TIME_ZONE, ...options }).format(
    new Date(value),
  );
export const formatTime = (value: string | number) =>
  formatDate(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const hours = (value: number) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(value);
export function dateKey(value: string | number): string {
  const parts = new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}
export const atNoon = (date: string) => Date.parse(`${date}T12:00:00-05:00`);
export const plusDays = (date: string, count: number) => dateKey(atNoon(date) + count * 86400000);
export const titleCase = (value: string) =>
  value
    .toLocaleLowerCase("es-EC")
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es-EC"));
export const endTime = (item: PracticeHistoryItem) =>
  item.durationMinutes === null
    ? null
    : Date.parse(item.scheduledAt) + item.durationMinutes * 60000;
export interface HistoryEntry extends PracticeHistoryItem {
  instructor?: { id: string; name: string };
}
export type HistoryTone =
  | "scheduled"
  | "confirmed"
  | "attended"
  | "missed"
  | "pending-review"
  | "lost"
  | "cancelled"
  | "in-progress";
export interface HistoryState {
  label: string;
  tone: HistoryTone;
  icon: "check" | "cross" | "clock" | "calendar";
  priority: number;
}
export function isUpcoming(item: PracticeHistoryItem, now: number | null): boolean {
  return (
    item.estado === "pendiente" &&
    ["asignado", "confirmado"].includes(item.slotStatus ?? "") &&
    (now === null || (endTime(item) ?? Date.parse(item.scheduledAt)) > now)
  );
}
export function stateOf(item: PracticeHistoryItem, now: number | null): HistoryState {
  if (item.resultado === "hora_perdida")
    return { label: "Hora perdida", tone: "lost", icon: "clock", priority: 6 };
  if (item.estado === "asistio")
    return { label: "Asistió", tone: "attended", icon: "check", priority: 3 };
  if (item.estado === "no_asistio")
    return { label: "No asistió", tone: "missed", icon: "cross", priority: 8 };
  if (item.estado === "falta" || item.resultado === "falta")
    return { label: "Falta", tone: "missed", icon: "cross", priority: 8 };
  if (item.estado === "cancelada" || item.slotStatus === "sin_practica")
    return { label: "Cancelada", tone: "cancelled", icon: "cross", priority: 2 };
  if (item.estado === "liberada" || item.slotStatus === "liberado")
    return { label: "Pendiente por reponer", tone: "pending-review", icon: "clock", priority: 5 };
  if (item.slotStatus === "disponible")
    return { label: "Disponible", tone: "scheduled", icon: "calendar", priority: 4 };
  if (isUpcoming(item, now)) {
    if (now !== null && Date.parse(item.scheduledAt) <= now)
      return { label: "En curso", tone: "in-progress", icon: "clock", priority: 9 };
    return {
      label: item.slotStatus === "confirmado" ? "Programada · confirmada" : "Programada",
      tone: item.slotStatus === "confirmado" ? "confirmed" : "scheduled",
      icon: "calendar",
      priority: 4,
    };
  }
  return { label: "Por registrar", tone: "pending-review", icon: "clock", priority: 7 };
}
export function enrich(
  items: PracticeHistoryItem[],
  slots: StudentPracticeSlot[],
  cohortId: string | null,
): HistoryEntry[] {
  const own = new Map(
    slots
      .filter(
        (slot) => slot.studentId !== null && slot.cohortId === cohortId && "instructorName" in slot,
      )
      .map((slot) => [slot.id, slot]),
  );
  return items.map((item) => {
    const slot = own.get(item.practiceSlotId);
    // Cancellation snapshots can reference a reused slot: never borrow its current instructor.
    if (
      !item.id.startsWith("practice:") ||
      !slot ||
      Date.parse(slot.scheduledAt) !== Date.parse(item.scheduledAt) ||
      !("instructorId" in slot) ||
      !("instructorName" in slot) ||
      !slot.instructorName
    )
      return item;
    return { ...item, instructor: { id: slot.instructorId, name: titleCase(slot.instructorName) } };
  });
}
export interface HistoryBlock {
  id: string;
  day: string;
  start: number;
  end: number | null;
  entries: HistoryEntry[];
}
export function groupHistory(entries: HistoryEntry[], ascending: boolean): HistoryBlock[] {
  const result: HistoryBlock[] = [];
  for (const entry of [...entries].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || a.id.localeCompare(b.id),
  )) {
    const previous = result.at(-1),
      last = previous?.entries.at(-1);
    if (
      previous &&
      last &&
      entry.instructor &&
      last.instructor?.id === entry.instructor.id &&
      previous.day === dateKey(entry.scheduledAt) &&
      previous.end === Date.parse(entry.scheduledAt) &&
      entry.cancellationId === null &&
      last.cancellationId === null
    ) {
      previous.entries.push(entry);
      previous.end = endTime(entry);
    } else
      result.push({
        id: entry.id,
        day: dateKey(entry.scheduledAt),
        start: Date.parse(entry.scheduledAt),
        end: endTime(entry),
        entries: [entry],
      });
  }
  return ascending ? result : result.reverse();
}
export type Filter = "all" | "upcoming" | "attended" | "missed" | "cancelled";
export type Range = "all" | "month" | "weeks";
export const filterLabels: Record<Filter, string> = {
  all: "Todas",
  upcoming: "Próximas",
  attended: "Asistidas",
  missed: "No asistió",
  cancelled: "Canceladas / Perdidas",
};
export function matchesFilter(item: PracticeHistoryItem, filter: Filter, now: number | null) {
  switch (filter) {
    case "upcoming":
      return isUpcoming(item, now);
    case "attended":
      return item.estado === "asistio";
    case "missed":
      return item.estado === "no_asistio" || item.estado === "falta";
    case "cancelled":
      return (
        ["cancelada", "liberada", "falta"].includes(item.estado) ||
        item.slotStatus === "sin_practica" ||
        item.resultado === "hora_perdida"
      );
    default:
      return true;
  }
}
export function matchesRange(item: PracticeHistoryItem, range: Range, now: number | null) {
  if (range === "all" || now === null) return true;
  const key = dateKey(item.scheduledAt),
    today = dateKey(now);
  return range === "month"
    ? key.slice(0, 7) === today.slice(0, 7)
    : key >= plusDays(today, -27) && key <= today;
}
export const relativeDay = (date: string, now: number | null) =>
  now === null
    ? ""
    : date === dateKey(now)
      ? "Hoy"
      : date === plusDays(dateKey(now), 1)
        ? "Mañana"
        : "";
