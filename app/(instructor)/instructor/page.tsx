"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { addWeeks, dayKey, formatWeekRangeLabel, getWeekDays } from "@/lib/utils/calendar";
import { formatSchoolTime, schoolCalendarDate, schoolWeekRange } from "@/lib/utils/schoolTime";
import type { PracticeSlot, PracticeSlotStatus, PracticeSlotWithNames } from "@/types";

import { IdentidadPresencialControl } from "./IdentidadPresencialControl";
import { SlotAttendance } from "./SlotAttendance";

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
const INSTRUCTOR_STATUS_LABELS: Record<PracticeSlotStatus, string> = {
  disponible: "Libre",
  liberado: "Libre",
  asignado: "Reservada",
  confirmado: "Confirmada",
  completado: "Realizada",
  sin_practica: "Sin alumno",
};

type BlockDefinition = {
  id: string;
  slotIds: string[];
  startsAt: string;
  endsAt: string;
  hours: number;
};

// La agrupación en bloques es opcional: si la respuesta no sirve, la agenda
// muestra cada hora por separado. Devuelve null cuando hay que avisar.
function readBlocks(value: unknown): BlockDefinition[] | null {
  if (!Array.isArray(value)) return null;
  const valid = value.filter(
    (block): block is BlockDefinition =>
      typeof block === "object" &&
      block !== null &&
      typeof (block as BlockDefinition).id === "string" &&
      Array.isArray((block as BlockDefinition).slotIds),
  );
  return valid.length === value.length ? valid : null;
}

// Recibe una fecha civil, como las que produce schoolCalendarDate.
function formatDayLabel(day: Date): string {
  const weekday = day.toLocaleDateString("es-EC", { weekday: "long" });
  const month = day.toLocaleDateString("es-EC", { month: "long" });
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day.getDate()} de ${month}`;
}

export default function InstructorPage() {
  const [requestedWeek, setRequestedWeek] = useState(() => schoolCalendarDate(new Date()));
  const [requestId, setRequestId] = useState(0);
  const [currentDate, setCurrentDate] = useState(requestedWeek);
  const [data, setData] = useState<PracticeSlotWithNames[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockDefinitions, setBlockDefinitions] = useState<BlockDefinition[]>([]);
  const [blocksFailed, setBlocksFailed] = useState(false);
  const [updates, setUpdates] = useState<Record<string, PracticeSlot>>({});
  useEffect(() => {
    let active = true;
    const { from, to } = schoolWeekRange(requestedWeek);
    const params = new URLSearchParams({ from, to });
    const weekDays = getWeekDays(requestedWeek);
    const blockParams = new URLSearchParams({ from: dayKey(weekDays[0]), to: dayKey(weekDays[6]) });
    void Promise.all([
      api.get<PracticeSlotWithNames[]>(`/practice-slots?${params}`),
      // Si los bloques fallan, las franjas se muestran igual, una por hora.
      api
        .get<unknown>(`/practice-slots/blocks/instructor-groups?${blockParams}`)
        .then(readBlocks, () => null),
    ]).then(
      ([slots, blocks]) => {
        if (!active) return;
        setBlockDefinitions(blocks ?? []);
        setBlocksFailed(blocks === null);
        setData(slots);
        setUpdates({});
        setCurrentDate(requestedWeek);
        setIsLoading(false);
      },
      (cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "No se pudo consultar el horario. Intenta de nuevo.",
        );
        setIsLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [requestedWeek, requestId]);

  useEffect(() => {
    const refresh = () => setRequestId((id) => id + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("practice-notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("practice-notifications-updated", refresh);
    };
  }, []);
  const blockBySlot = new Map(
    blockDefinitions.flatMap((block) => block.slotIds.map((id) => [id, block] as const)),
  );
  function requestWeek(date: Date) {
    setError(null);
    setIsLoading(true);
    setRequestedWeek(date);
    setRequestId((id) => id + 1);
  }
  const days = getWeekDays(currentDate);
  const groups = useMemo(() => {
    const result = new Map<string, PracticeSlotWithNames[]>();
    for (const original of data ?? []) {
      const slot = { ...original, ...updates[original.id] };
      const key = dayKey(schoolCalendarDate(new Date(slot.scheduledAt)));
      const group = result.get(key) ?? [];
      group.push(slot);
      result.set(key, group);
    }
    for (const group of result.values()) {
      group.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
    }
    return result;
  }, [data, updates]);
  const todayKey = dayKey(schoolCalendarDate(new Date()));
  const selectedKey = dayKey(currentDate);
  const selectedSlots = groups.get(selectedKey) ?? [];
  const selectedBlocks = new Map<string, PracticeSlotWithNames[]>();
  for (const slot of selectedSlots) {
    const key = blockBySlot.get(slot.id)?.id ?? slot.id;
    selectedBlocks.set(key, [...(selectedBlocks.get(key) ?? []), slot]);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Mi agenda</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p aria-live="polite" className="font-medium text-text-primary">
            {formatWeekRangeLabel(currentDate)}
          </p>
          <p className="text-sm text-text-secondary">Hora de Ecuador (America/Guayaquil)</p>
        </div>
        <nav aria-label="Navegación semanal" className="flex min-w-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => requestWeek(addWeeks(currentDate, -1))}
          >
            Semana anterior
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => requestWeek(schoolCalendarDate(new Date()))}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => requestWeek(addWeeks(currentDate, 1))}
          >
            Semana siguiente
          </Button>
        </nav>
      </div>
      <nav aria-label="Días de la semana" className="grid min-w-0 grid-cols-7 gap-1">
        {days.map((day, index) => {
          const key = dayKey(day);
          const count = new Set(
            (groups.get(key) ?? [])
              .filter((slot) => slot.studentId !== null)
              .map((slot) => blockBySlot.get(slot.id)?.id ?? slot.id),
          ).size;
          const isToday = key === todayKey;
          return (
            <Button
              key={key}
              variant={key === selectedKey ? "primary" : "secondary"}
              className="h-auto min-w-0 flex-col gap-1 px-0 py-2"
              aria-label={`${formatDayLabel(day)}, ${count} bloques con alumno${isToday ? ", hoy" : ""}`}
              aria-pressed={key === selectedKey}
              aria-current={isToday ? "date" : undefined}
              onClick={() => setCurrentDate(day)}
            >
              <span aria-hidden="true">{DAY_INITIALS[index]}</span>
              <span aria-hidden="true">{day.getDate()}</span>
              <span aria-hidden="true" className="text-xs">
                {count}
              </span>
              <span aria-hidden="true" className="h-4 text-xs">
                {isToday ? "Hoy" : ""}
              </span>
            </Button>
          );
        })}
      </nav>
      <p className="text-xs text-text-secondary">Bloques con alumno por día</p>
      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Cargando horario…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
      {data && blocksFailed ? (
        <p className="text-xs text-text-secondary">No se pudieron agrupar las horas en bloques</p>
      ) : null}
      {data ? (
        <section aria-labelledby="selected-day" className="min-w-0">
          <h2
            id="selected-day"
            className="mb-3 font-display text-lg font-semibold text-text-primary"
          >
            {formatDayLabel(currentDate)}
          </h2>
          <Card className="min-w-0">
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-text-secondary">No tienes bloques este día.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {[...selectedBlocks.entries()].map(([key, slots]) => (
                  <section key={key} className="py-4 first:pt-0">
                    <h3 className="mb-2 font-display text-base font-semibold text-text-primary">
                      Bloque {formatSchoolTime(slots[0].scheduledAt)}–
                      {formatSchoolTime(
                        new Date(
                          Date.parse(slots[slots.length - 1].scheduledAt) + 3600000,
                        ).toISOString(),
                      )}{" "}
                      · {slots.length} h
                    </h3>
                    <p className="mb-2 text-sm text-text-secondary">
                      {slots[0].studentName ?? "Sin alumno"}
                    </p>
                    <div className="ml-1 border-l-2 border-border pl-3">
                      {slots.map((slot) => {
                        const isFree = slot.status === "disponible" || slot.status === "liberado";
                        const isMuted = isFree || slot.status === "sin_practica";
                        const end = new Date(
                          Date.parse(slot.scheduledAt) + slot.durationMinutes * 60_000,
                        );
                        return (
                          <article
                            key={slot.id}
                            aria-label={`Franja de las ${formatSchoolTime(slot.scheduledAt)}`}
                            className="flex min-w-0 flex-col gap-3 py-3 first:pt-0"
                          >
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                              <time
                                dateTime={slot.scheduledAt}
                                className={
                                  isMuted
                                    ? "font-medium text-text-secondary"
                                    : "font-medium text-text-primary"
                                }
                              >
                                {formatSchoolTime(slot.scheduledAt)} –{" "}
                                {formatSchoolTime(end.toISOString())}
                              </time>
                              {!isMuted ? (
                                <StatusBadge
                                  status={slot.status}
                                  label={INSTRUCTOR_STATUS_LABELS[slot.status]}
                                />
                              ) : slot.status === "sin_practica" ? (
                                <span className="text-sm text-text-secondary">Sin alumno</span>
                              ) : null}
                            </div>
                            <p
                              className={`break-words text-sm ${isMuted ? "text-text-secondary" : "text-text-primary"}`}
                            >
                              {isFree ? "Libre" : (slot.studentName ?? "Libre")}
                            </p>
                            <IdentidadPresencialControl slot={slot} />
                            {slot.status === "completado" ? (
                              <SlotAttendance
                                slot={slot}
                                onSaved={(updated) =>
                                  setUpdates((previous) => ({ ...previous, [updated.id]: updated }))
                                }
                              />
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
