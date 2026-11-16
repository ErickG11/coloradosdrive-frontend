import { dayKey } from "@/lib/utils/calendar";
import { formatSchoolTime, schoolCalendarDate } from "@/lib/utils/schoolTime";
import type { PracticeSlotStatus, PracticeSlotWithNames } from "@/types";

export const FIRST_HOUR = 6;
export const LAST_HOUR = 22;
export const HOUR_HEIGHT = 144;
export const STATUS_LABELS: Record<PracticeSlotStatus, string> = {
  disponible: "Libre",
  liberado: "Libre",
  asignado: "Reservada",
  confirmado: "Confirmada",
  completado: "Realizada",
  sin_practica: "Sin alumno",
};
export type AgendaSlot = PracticeSlotWithNames;
export type BlockDefinition = { id: string; slotIds: string[] };
export type AgendaBlock = {
  id: string;
  date: string;
  slots: AgendaSlot[];
  startsAt: string;
  endsAt: string;
  minutes: number;
  status: PracticeSlotStatus;
};

export function readBlocks(value: unknown): BlockDefinition[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !Array.isArray(item.slotIds) ||
      item.slotIds.length < 1 ||
      item.slotIds.length > 2
    )
      return null;
    for (const id of item.slotIds) {
      if (typeof id !== "string" || seen.has(id)) return null;
      seen.add(id);
    }
  }
  return value as BlockDefinition[];
}

export function formatDayLabel(day: Date): string {
  const weekday = day.toLocaleDateString("es-EC", { weekday: "long" });
  const month = day.toLocaleDateString("es-EC", { month: "long" });
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day.getDate()} de ${month}`;
}
export const slotEnd = (slot: AgendaSlot) =>
  Date.parse(slot.scheduledAt) + slot.durationMinutes * 60_000;
export const schoolMinutes = (iso: string) => {
  const [hours, minutes] = formatSchoolTime(iso).split(":").map(Number);
  return hours * 60 + minutes;
};
export const blockTime = (block: AgendaBlock) =>
  `${formatSchoolTime(block.startsAt)} – ${formatSchoolTime(block.endsAt)}`;
export const attendanceHref = (date: string, blockId?: string) =>
  `/instructor/asistencias?${new URLSearchParams({ fecha: date, ...(blockId ? { bloque: blockId } : {}) })}`;
export const pendingAttendance = (block: AgendaBlock, now: number) =>
  block.slots.filter(
    (slot) =>
      slot.studentId !== null &&
      slot.status === "completado" &&
      slot.attended === null &&
      slotEnd(slot) <= now,
  ).length;
export const hasEndedHour = (block: AgendaBlock, now: number) =>
  block.slots.some((slot) => slot.studentId !== null && slotEnd(slot) <= now);

export function buildAgendaBlocks(
  slots: AgendaSlot[],
  definitions: BlockDefinition[],
): AgendaBlock[] {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const validGroups = new Map<string, BlockDefinition>();
  for (const definition of definitions) {
    const group = definition.slotIds
      .map((id) => byId.get(id))
      .filter((slot): slot is AgendaSlot => !!slot)
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
    if (group.length !== definition.slotIds.length || !group.length) continue;
    const first = group[0];
    if (
      group.every(
        (slot, index) =>
          slot.studentId === first.studentId &&
          slot.cohortId === first.cohortId &&
          dayKey(schoolCalendarDate(new Date(slot.scheduledAt))) ===
            dayKey(schoolCalendarDate(new Date(first.scheduledAt))) &&
          (index === 0 || slotEnd(group[index - 1]) === Date.parse(slot.scheduledAt)),
      )
    ) {
      for (const slot of group) validGroups.set(slot.id, definition);
    }
  }
  const groups = new Map<string, AgendaSlot[]>();
  for (const slot of slots) {
    const key = validGroups.get(slot.id)?.id ?? `slot:${slot.id}`;
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups]
    .map(([id, group]) => {
      group.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
      const first = group[0];
      const end = Math.max(...group.map(slotEnd));
      const status = group.every((slot) => slot.status === "completado")
        ? "completado"
        : group.some((slot) => slot.status === "confirmado")
          ? "confirmado"
          : first.status;
      return {
        id,
        slots: group,
        date: dayKey(schoolCalendarDate(new Date(first.scheduledAt))),
        startsAt: first.scheduledAt,
        endsAt: new Date(end).toISOString(),
        minutes: (end - Date.parse(first.scheduledAt)) / 60_000,
        status,
      };
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

// Cada conjunto de intervalos que se cruzan comparte columnas; los bloques contiguos no se cruzan.
export function layoutDay(blocks: AgendaBlock[]) {
  const result: { block: AgendaBlock; lane: number; lanes: number }[] = [];
  let cluster: typeof result = [];
  let ends: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const item of cluster) item.lanes = ends.length;
    result.push(...cluster);
    cluster = [];
    ends = [];
  };
  for (const block of [...blocks].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const start = Date.parse(block.startsAt);
    if (start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    let lane = ends.findIndex((end) => end <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = Date.parse(block.endsAt);
    clusterEnd = Math.max(clusterEnd, ends[lane]);
    cluster.push({ block, lane, lanes: 1 });
  }
  flush();
  return result;
}

export const fitsCalendar = (block: AgendaBlock) => {
  const start = schoolMinutes(block.startsAt);
  return start >= FIRST_HOUR * 60 && start + block.minutes <= LAST_HOUR * 60;
};
