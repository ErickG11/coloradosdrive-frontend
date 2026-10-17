"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { addWeeks, dayKey, formatWeekRangeLabel, getWeekDays } from "@/lib/utils/calendar";
import { formatSchoolTime, schoolCalendarDate, schoolWeekRange } from "@/lib/utils/schoolTime";
import type { PracticeSlot, PracticeSlotWithNames } from "@/types";

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
type StudentSlotStatus = "asignado" | "confirmado" | "completado";
type StudentSlot = PracticeSlotWithNames & { status: StudentSlotStatus };
const INSTRUCTOR_STATUS_LABELS: Record<StudentSlotStatus, string> = {
  asignado: "Reservada",
  confirmado: "Confirmada",
  completado: "Realizada",
};

function hasStudent(slot: PracticeSlotWithNames): slot is StudentSlot {
  return (
    slot.studentId !== null &&
    (slot.status === "asignado" || slot.status === "confirmado" || slot.status === "completado")
  );
}

function isFree(slot: PracticeSlotWithNames): boolean {
  return slot.studentId === null && (slot.status === "disponible" || slot.status === "liberado");
}

// Recibe una fecha civil, como las que produce schoolCalendarDate.
function formatDayLabel(day: Date): string {
  const weekday = day.toLocaleDateString("es-EC", { weekday: "long" }).toLocaleLowerCase("es-EC");
  const month = day.toLocaleDateString("es-EC", { month: "long" }).toLocaleLowerCase("es-EC");
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day.getDate()} de ${month}`;
}

function SlotAttendance({
  slot,
  onSaved,
}: {
  slot: PracticeSlotWithNames;
  onSaved: (slot: PracticeSlot) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingCorrection, setPendingCorrection] = useState<boolean | null>(null);

  async function save(attended: boolean) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.patch<PracticeSlot>(`/practice-slots/${slot.id}/attendance`, {
        attended,
      });
      onSaved(updated);
      setEditing(false);
      setPendingCorrection(null);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo guardar la asistencia. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  function choose(attended: boolean) {
    if (slot.attended !== null) {
      if (slot.attended === attended) {
        setEditing(false);
      } else {
        setPendingCorrection(attended);
      }
      return;
    }
    void save(attended);
  }

  const attendanceLabel = (attended: boolean) => (attended ? "Asistió" : "No asistió");

  return (
    <div className="flex flex-col gap-2">
      <p role={saved ? "status" : undefined} className="text-sm text-text-secondary">
        {saved ? "Asistencia guardada: " : "Asistencia: "}
        {slot.attended === null ? "Sin registrar" : slot.attended ? "Asistió" : "No asistió"}
      </p>
      {slot.attended === null || editing ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving} onClick={() => choose(true)}>
            Asistió
          </Button>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => choose(false)}>
            No asistió
          </Button>
          {editing ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            setEditing(true);
            setSaved(false);
          }}
        >
          Cambiar asistencia
        </Button>
      )}
      {saving ? (
        <p role="status" className="text-sm text-text-secondary">
          Guardando asistencia…
        </p>
      ) : null}
      {error && pendingCorrection === null ? (
        <p role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
      <Modal
        isOpen={pendingCorrection !== null}
        onClose={() => {
          if (!saving) {
            setPendingCorrection(null);
            setError(null);
          }
        }}
        title="Confirmar cambio de asistencia"
      >
        <p className="text-sm text-text-secondary">
          Valor actual: {slot.attended === null ? "Sin registrar" : attendanceLabel(slot.attended)}.{" "}
          Nuevo valor: {pendingCorrection === null ? "" : attendanceLabel(pendingCorrection)}.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-accent-red">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setPendingCorrection(null);
              setError(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              if (pendingCorrection !== null) void save(pendingCorrection);
            }}
          >
            Confirmar cambio
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function InstructorPage() {
  const [requestedWeek, setRequestedWeek] = useState(() => schoolCalendarDate(new Date()));
  const [requestId, setRequestId] = useState(0);
  const [currentDate, setCurrentDate] = useState(requestedWeek);
  const [data, setData] = useState<PracticeSlotWithNames[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, PracticeSlot>>({});
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
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
  const todayKey = dayKey(schoolCalendarDate(now));
  const selectedKey = dayKey(currentDate);
  const selectedSlots = groups.get(selectedKey) ?? [];
  const studentSlots = selectedSlots.filter(hasStudent);
  const freeHours = selectedSlots
    .filter((slot) => isFree(slot) && (selectedKey !== todayKey || Date.parse(slot.scheduledAt) >= now.getTime()))
    .map((slot) => formatSchoolTime(slot.scheduledAt));

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
          const count = (groups.get(key) ?? []).filter(hasStudent).length;
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
            {studentSlots.length === 0 ? (
              <p className="text-sm text-text-secondary">No tienes prácticas con alumno este día.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {studentSlots.map((slot) => {
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
                          className="font-medium text-text-primary"
                        >
                          {formatSchoolTime(slot.scheduledAt)} –{" "}
                          {formatSchoolTime(end.toISOString())}
                        </time>
                        <StatusBadge status={slot.status} label={INSTRUCTOR_STATUS_LABELS[slot.status]} />
                      </div>
                      <p className="break-words text-sm text-text-primary">
                        {slot.studentName ?? "Alumno no disponible"}
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
            {freeHours.length > 0 ? (
              <p className="text-sm text-text-secondary">Horas libres: {freeHours.join(", ")}</p>
            ) : null}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
