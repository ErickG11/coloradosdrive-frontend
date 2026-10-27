"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { addWeeks, dayKey, formatWeekRangeLabel, getWeekDays } from "@/lib/utils/calendar";
import { formatSchoolTime, schoolCalendarDate, schoolWeekRange } from "@/lib/utils/schoolTime";
import type { PracticeSlot, PracticeSlotStatus, PracticeSlotWithNames } from "@/types";

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
  const [updates, setUpdates] = useState<Record<string, PracticeSlot>>({});
  useEffect(() => {
    let active = true;
    const { from, to } = schoolWeekRange(requestedWeek);
    const params = new URLSearchParams({ from, to });
    void api.get<PracticeSlotWithNames[]>(`/practice-slots?${params}`).then(
      (slots) => {
        if (!active) return;
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
          const count = (groups.get(key) ?? []).filter((slot) => slot.studentId !== null).length;
          const isToday = key === todayKey;
          return (
            <Button
              key={key}
              variant={key === selectedKey ? "primary" : "secondary"}
              className="h-auto min-w-0 flex-col gap-1 px-0 py-2"
              aria-label={`${formatDayLabel(day)}, ${count} franjas con alumno${isToday ? ", hoy" : ""}`}
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
      <p className="text-xs text-text-secondary">Franjas con alumno por día</p>
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
              <p className="text-sm text-text-secondary">No tienes franjas este día.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {selectedSlots.map((slot) => {
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
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
