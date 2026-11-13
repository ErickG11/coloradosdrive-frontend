"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type {
  PlanChangeState,
  PlanChangeCalendar,
} from "@/types/adminPlanChange";
import type {
  StudentScheduleSelection,
  StudentScheduleReservation,
  StudentReservationSnapshot,
} from "@/types/studentSchedule";
import { useStudentReservation } from "./useStudentReservation";
import { ReservationBanner } from "./ReservationBanner";
import { SchedulePlanView } from "./SchedulePlanView";
import { PlanFields } from "./PlanFields";
import type { StudentPlanRules, StudentScheduleStartOption } from "@/types/studentSchedule";
import { dayLabelLong, plural } from "./scheduleFormat";
const options = () => ({ signal: AbortSignal.timeout(20_000), cache: "no-store" as const });
const localDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date(iso));
const CONSULTA = "Consulta de horarios disponibles";
const BLOCKED_CODES = new Set(["PLAN_CAMBIO_FUERA_PLAZO", "PLAN_CAMBIO_ESTADO_INVALIDO"]);
const BLOCKED_TEXT =
  "Este alumno ya empezó sus prácticas o faltan menos de 48 horas para la primera. El plan ya no se puede cambiar desde aquí. Si no puede asistir un día, puede usar «No podré asistir» desde su agenda.";
interface HourInstructor {
  scheduledAt: string;
  instructorId: string;
  instructorName: string;
}
interface Props {
  enrollmentId: string;
  studentId: string;
  onChanged?: () => void;
}
function AdminPlanChangeForm({ enrollmentId, studentId, onChanged }: Props) {
  const root = `/admin/estudiantes/${studentId}/matriculas/${enrollmentId}/cambio`;
  const meta = useFetch<PlanChangeState>(root);
  const limits = useFetch<StudentPlanRules>("/admin/manual-enrollments/rules");
  const [input, setInput] = useState<StudentScheduleSelection>({
    modalidad: "entre_semana",
    fechaInicio: "",
    horasPorDia: 0,
    horaInicio: -1,
  });
  const [month, setMonth] = useState("");
  const [reason, setReason] = useState("");
  const [required, setRequired] = useState(false);
  const [horarios, setHorarios] = useState<{
    id: string;
    propuesto: HourInstructor[];
    actual: HourInstructor[];
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [calendar, setCalendar] = useState<{
    key: string;
    data?: PlanChangeCalendar;
    error?: string;
  } | null>(null);
  const refetchMeta = meta.refetch;
  const closed = useCallback(() => {
    refetchMeta();
    onChanged?.();
  }, [refetchMeta, onChanged]);
  const transport = useMemo(
    () =>
      studentId
        ? {
            current: async () => {
              const state = await api.get<PlanChangeState>(root, options());
              if (!state.serverNow) throw new Error("No se pudo verificar el reloj del servidor.");
              return { reserva: state.reservation ?? null, serverNow: state.serverNow };
            },
            change: async (
              id: string,
              action: "liberar" | "ampliar",
            ): Promise<StudentReservationSnapshot> => {
              if (action !== "liberar")
                throw new Error("La propuesta no permite ampliar el plazo.");
              return api.post<StudentReservationSnapshot>(
                `/admin/estudiantes/${studentId}/matriculas/cambio/${id}/liberar`,
                {},
                options(),
              );
            },
          }
        : undefined,
    [root, studentId],
  );
  const reservation = useStudentReservation(
    closed,
    enrollmentId,
    transport,
    meta.data?.active === true,
  );
  const pending = reservation.reservation?.purpose === "plan_change" && reservation.held;
  const effective = input;
  const minDate = meta.data?.serverNow
    ? localDate(meta.data.serverNow)
    : localDate(new Date().toISOString());
  const selectedMonth = month || minDate.slice(0, 7);
  const reviewId = pending && reservation.reservation ? reservation.reservation.id : null;
  useEffect(() => {
    if (!reviewId) return;
    const abort = new AbortController();
    void api
      .get<{ propuesto: HourInstructor[]; actual: HourInstructor[] }>(
        `/admin/estudiantes/${studentId}/matriculas/cambio/${reviewId}/horarios`,
        { signal: abort.signal, cache: "no-store" },
      )
      .then((data) => {
        if (!abort.signal.aborted) setHorarios({ id: reviewId, ...data });
      })
      .catch(() => {
        /* Sin el detalle por instructor, el resumen sigue mostrando el plan. */
      });
    return () => abort.abort();
  }, [reviewId, studentId]);
  const calendarKey =
    meta.data?.active && meta.data.canChange && !pending && selectedMonth && input.horasPorDia
      ? `${root}|${selectedMonth}|${input.modalidad}|${input.horasPorDia}`
      : null;
  useEffect(() => {
    if (!calendarKey) return;
    const abort = new AbortController();
    void api
      .post<PlanChangeCalendar>(
        `${root}/calendario`,
        {
          modalidad: input.modalidad,
          horasPorDia: input.horasPorDia,
          horaInicio: 6,
          fechaInicio: `${selectedMonth}-01`,
        },
        { signal: abort.signal, cache: "no-store" },
      )
      .then((data) => {
        if (!abort.signal.aborted) {
          setCalendar({ key: calendarKey, data });
          const selected = data.dias.find((d) => d.fecha === input.fechaInicio);
          if (selected && !selected.disponible)
            setInput((current) =>
              current.fechaInicio === input.fechaInicio &&
              current.horasPorDia === input.horasPorDia &&
              current.modalidad === input.modalidad
                ? { ...current, fechaInicio: "", horaInicio: -1 }
                : current,
            );
        }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setCalendar({
            key: calendarKey,
            error: error instanceof Error ? error.message : "No se pudo consultar el calendario.",
          });
      });
    return () => abort.abort();
  }, [calendarKey, root, input.modalidad, input.horasPorDia, selectedMonth]);
  const currentCalendar = calendar?.key === calendarKey ? calendar : null;
  // La consulta de horas libres no escribe nada: no necesita el motivo del cambio.
  const hourKey =
    input.fechaInicio && input.horasPorDia
      ? `${root}|${input.modalidad}|${input.horasPorDia}|${input.fechaInicio}|${limits.data?.endHour}`
      : null;
  const [hourResult, setHourResult] = useState<{
    key: string;
    hours: StudentScheduleStartOption[];
  } | null>(null);
  useEffect(() => {
    if (!hourKey) return;
    const abort = new AbortController();
    void api
      .post<StudentScheduleStartOption[]>(
        `${root}/opciones`,
        {
          ...input,
          horaInicio: 6,
          motivo: CONSULTA,
        },
        { signal: abort.signal, cache: "no-store" },
      )
      .then((hours) => {
        if (!abort.signal.aborted) {
          setHourResult({ key: hourKey, hours });
          if (
            input.horaInicio >= 0 &&
            !hours.some((h) => Number(h.hora.slice(0, 2)) === input.horaInicio && h.factible)
          )
            setInput((current) =>
              current.horaInicio === input.horaInicio ? { ...current, horaInicio: -1 } : current,
            );
        }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) {
          setHourResult({ key: hourKey, hours: [] });
          setMessage(
            error instanceof Error ? error.message : "No se pudieron consultar los horarios.",
          );
        }
      });
    return () => abort.abort();
    // La clave incluye todas las entradas de la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourKey]);
  async function propose() {
    if (!reason.trim()) {
      setRequired(true);
      setMessage(null);
      window.requestAnimationFrame(() => document.getElementById("plan-change-reason")?.focus());
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.post<StudentScheduleReservation>(
        `${root}/reservar`,
        { ...effective, motivo: reason.trim() },
        options(),
      );
      reservation.reserved(result);
      meta.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la propuesta. Consulta el estado antes de reintentar.",
      );
      reservation.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    const r = reservation.reservation;
    if (!r) return;
    setBusy(true);
    setMessage(null);
    try {
      const url = `/admin/estudiantes/${studentId}/matriculas/cambio/${r.id}/confirmar`;
      const done = await api.post<StudentScheduleReservation & { advertencia?: string }>(
        url,
        {},
        options(),
      );
      setMessage(
        done.advertencia
          ? `Horario actualizado. Se avisó al alumno. ${done.advertencia}`
          : "Horario actualizado. Se avisó al alumno y a los instructores afectados.",
      );
      setReason("");
      reservation.refetch();
      meta.refetch();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el cambio. Consulta el estado antes de reintentar.",
      );
      reservation.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (meta.data?.active === false) return null;
  if (meta.error)
    return (
      <p role="alert">
        {meta.error}{" "}
        <Button type="button" variant="secondary" onClick={meta.refetch}>
          Consultar cambio
        </Button>
      </p>
    );
  if (!meta.data) return <p role="status">Consultando opciones de cambio…</p>;
  const proposedPlan = reservation.reservation?.plan ?? null;
  const blockedText = BLOCKED_CODES.has(meta.data.reasonCode ?? "")
    ? BLOCKED_TEXT
    : (meta.data.reason ??
      "El plan actual se conserva. No hay un cambio disponible en este estado.");
  const current = meta.data.current;
  const review = pending && reservation.reservation ? reservation.reservation : null;
  const reviewHours = horarios && review && horarios.id === review.id ? horarios : null;
  const currentInstructors = new Set(reviewHours?.actual.map((h) => h.instructorId) ?? []);
  const byDay = new Map<string, HourInstructor[]>();
  for (const hour of reviewHours?.propuesto ?? []) {
    const day = localDate(hour.scheduledAt);
    byDay.set(day, [...(byDay.get(day) ?? []), hour]);
  }
  const changes = (hours: HourInstructor[]) =>
    currentInstructors.size > 0 && hours.some((h) => !currentInstructors.has(h.instructorId));
  const anyChange = [...byDay.values()].some(changes);
  return (
    <Card title="Cambiar horario de prácticas" className="mt-4">
      <p>
        Cambia el horario dentro de la cohorte actual. Para pasar a otra cohorte usa Cambiar de
        cohorte.
      </p>
      {current ? (
        <p className="mt-2 text-sm text-text-secondary">
          Plan actual: prácticas del {current.practiceStartDate ?? "—"} al{" "}
          {current.practiceEndDate ?? "—"}.
        </p>
      ) : null}
      <ReservationBanner state={reservation} />
      {review ? (
        <div className="mt-3 grid gap-3">
          <section
            aria-label="Resumen del cambio"
            className="grid gap-2 rounded-sm border border-border p-3 text-sm"
          >
            <p className="font-medium">Resumen del cambio</p>
            <p>
              <span className="text-text-secondary">Plan actual: </span>
              prácticas del {current?.practiceStartDate ?? "—"} al {current?.practiceEndDate ?? "—"}
            </p>
            {proposedPlan ? (
              <p>
                <span className="text-text-secondary">Plan nuevo: </span>
                {plural(proposedPlan.dias.length, "día", "días")} desde el{" "}
                {dayLabelLong(proposedPlan.dias[0].fecha)}, a las {proposedPlan.horaInicio},{" "}
                {plural(proposedPlan.horasPorDia, "hora", "horas")} por día (
                {plural(proposedPlan.totalHoras, "hora", "horas")} en total)
              </p>
            ) : null}
            <p>
              <span className="text-text-secondary">Motivo: </span>
              {reason}
            </p>
            {anyChange ? (
              <p role="status" className="font-medium">
                Los instructores afectados recibirán un aviso.
              </p>
            ) : null}
          </section>
          {proposedPlan ? (
            <ul className="grid gap-1 text-sm" aria-label="Horario propuesto por día">
              {proposedPlan.dias.map((day) => {
                const hours = byDay.get(day.fecha) ?? [];
                const names = [...new Set(hours.map((h) => h.instructorName))];
                return (
                  <li
                    key={day.fecha}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2"
                  >
                    <span>
                      {dayLabelLong(day.fecha)} · {day.horaInicio} a {day.horaFin}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {names.length ? names.join(", ") : "Instructor por confirmar"}
                      {changes(hours) ? (
                        <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning">
                          Cambia de instructor
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {!meta.data.canChange ? <p role="alert">{blockedText}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || reservation.action !== null}
              onClick={() => void reservation.change("liberar")}
            >
              Volver y conservar el plan actual
            </Button>
            <Button
              type="button"
              isLoading={busy}
              disabled={!meta.data.canChange || !reservation.live}
              onClick={() => void confirm()}
            >
              Confirmar cambio
            </Button>
          </div>
        </div>
      ) : meta.data.canChange ? (
        <div className="mt-4 grid gap-3">
          <PlanFields
            rules={limits.data ?? undefined}
            value={effective}
            onChange={setInput}
            month={selectedMonth}
            onMonth={setMonth}
            minDate={minDate}
            maxDate={meta.data.calendarEndDate ?? undefined}
            days={currentCalendar?.data?.dias ?? []}
            hours={hourResult?.key === hourKey ? hourResult.hours : []}
            disabled={busy}
            loading={
              Boolean(calendarKey && !currentCalendar) ||
              Boolean(hourKey && hourResult?.key !== hourKey)
            }
          />
          {currentCalendar?.error ? <p role="alert">{currentCalendar.error}</p> : null}
          <Input
            id="plan-change-reason"
            label="Motivo del cambio *"
            maxLength={500}
            value={reason}
            aria-required="true"
            error={required && !reason.trim() ? "Este campo es obligatorio." : undefined}
            onChange={(e) => {
              setReason(e.target.value);
              setRequired(false);
            }}
            disabled={busy}
          />
          <Button
            type="button"
            variant="secondary"
            isLoading={busy}
            disabled={
              busy || !effective.fechaInicio || !effective.horasPorDia || effective.horaInicio < 0
            }
            onClick={() => void propose()}
          >
            Ver propuesta
          </Button>
          <p className="text-sm text-text-secondary">
            El horario actual se conserva hasta que confirmes el cambio.
          </p>
        </div>
      ) : (
        <p role="status" className="mt-3">
          {blockedText}
        </p>
      )}
      {message ? (
        <p role="status" className="mt-3">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
export function AdminPlanChangePanel({
  studentId,
  enrollmentId,
  onChanged,
}: {
  studentId: string;
  enrollmentId: string;
  courseType?: "A" | "B";
  onChanged?: () => void;
}) {
  return (
    <AdminPlanChangeForm studentId={studentId} enrollmentId={enrollmentId} onChanged={onChanged} />
  );
}
