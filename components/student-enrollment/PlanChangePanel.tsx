"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { Cohort, Course } from "@/types";
import type { PlanChangeState, PlanChangePreview, PlanChangeCalendar } from "@/types/planChange";
import type {
  StudentScheduleSelection,
  StudentScheduleReservation,
  StudentReservationSnapshot,
} from "@/types/studentSchedule";
import { useStudentReservation } from "./useStudentReservation";
import { ReservationBanner } from "./ReservationBanner";
import { SchedulePlanView } from "./SchedulePlanView";
import { dayLabel, summarySentence } from "./scheduleFormat";
const options = () => ({ signal: AbortSignal.timeout(20_000), cache: "no-store" as const });
const localDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date(iso));
interface Props {
  enrollmentId: string;
  studentId?: string;
  targets?: { id: string; label: string }[];
  onChanged?: () => void;
}
export function PlanChangePanel({ enrollmentId, studentId, targets, onChanged }: Props) {
  const admin = Boolean(studentId),
    root = studentId
      ? `/admin/estudiantes/${studentId}/matriculas/${enrollmentId}/cambio`
      : `/estudiantes/inscripcion/cambio/${enrollmentId}`;
  const meta = useFetch<PlanChangeState>(root);
  const limits = useFetch<{ endHour?: number }>(
    admin ? "/admin/manual-enrollments/rules" : "/estudiantes/inscripcion/horario/config",
  );
  const [input, setInput] = useState<StudentScheduleSelection>({
    modalidad: "entre_semana",
    fechaInicio: "",
    horasPorDia: 3,
    horaInicio: 6,
  });
  const [month, setMonth] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ key: string; data: PlanChangePreview } | null>(null);
  const [calendar, setCalendar] = useState<{
    key: string;
    data?: PlanChangeCalendar;
    error?: string;
  } | null>(null);
  const closed = useCallback(() => {
    meta.refetch();
    onChanged?.();
  }, [meta.refetch, onChanged]);
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
  const effective = {
    ...input,
    fechaInicio:
      input.fechaInicio ||
      meta.data?.current?.practiceStartDate ||
      (meta.data?.serverNow ? localDate(meta.data.serverNow) : ""),
  };
  const selectedMonth = month || effective.fechaInicio.slice(0, 7);
  const key = JSON.stringify({
    effective,
    reason: admin ? reason : "",
    target: admin ? target : "",
  });
  const calendarKey =
    meta.data?.active && meta.data.canChange && !pending && selectedMonth
      ? `${root}|${selectedMonth}|${input.modalidad}|${input.horasPorDia}|${target}`
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
          ...(admin && target ? { cohortId: target } : {}),
        },
        { signal: abort.signal, cache: "no-store" },
      )
      .then((data) => {
        if (!abort.signal.aborted) setCalendar({ key: calendarKey, data });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setCalendar({
            key: calendarKey,
            error: error instanceof Error ? error.message : "No se pudo consultar el calendario.",
          });
      });
    return () => abort.abort();
  }, [calendarKey, root, input.modalidad, input.horasPorDia, selectedMonth, admin, target]);
  const currentCalendar = calendar?.key === calendarKey ? calendar : null;
  async function propose(reserve = false) {
    if (admin && !reason.trim()) {
      setMessage("Escribe el motivo de la reasignación.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = {
        ...effective,
        ...(admin ? { motivo: reason.trim(), ...(target ? { cohortId: target } : {}) } : {}),
      };
      if (reserve) {
        const result = await api.post<StudentScheduleReservation>(
          `${root}/reservar`,
          body,
          options(),
        );
        reservation.reserved(result);
        meta.refetch();
        setPreview(null);
      } else {
        const result = await api.post<PlanChangePreview>(`${root}/preview`, body, options());
        setPreview({ key, data: result });
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar la respuesta. Consulta la propuesta antes de reintentar.",
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
      const url = studentId
        ? `/admin/estudiantes/${studentId}/matriculas/cambio/${r.id}/confirmar`
        : `/estudiantes/inscripcion/cambio/reserva/${r.id}/confirmar`;
      await api.post<StudentScheduleReservation>(url, {}, options());
      setMessage(
        "Cambio confirmado. Conservamos el importe pagado y la factura; recibirás las nuevas fechas por correo.",
      );
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
  const proposed = preview?.key === key ? preview.data : null;
  const summary = proposed?.plan;
  return (
    <Card title={admin ? "Reasignar plan del alumno" : "Cambiar mi plan"} className="mt-4">
      <p>
        Tu horario actual se conserva hasta confirmar un intercambio completo. Esta operación no
        crea un pago ni modifica la factura.
      </p>
      {meta.data.windowClosesAt ? (
        <p className="mt-2 text-sm">
          Plazo de cambio:{" "}
          {new Date(meta.data.windowClosesAt).toLocaleString("es-EC", {
            timeZone: "America/Guayaquil",
          })}{" "}
          (Guayaquil).{!admin ? ` Cambios disponibles: ${meta.data.freeRemaining ?? 0}.` : ""}
        </p>
      ) : null}
      <ReservationBanner state={reservation} />
      {pending && reservation.reservation ? (
        <div className="mt-3 grid gap-3">
          {reservation.reservation.plan ? (
            <SchedulePlanView
              days={reservation.reservation.plan.dias.map((d) => ({ ...d, ok: true }))}
            />
          ) : null}
          {!meta.data.canChange ? <p role="alert">{meta.data.reason}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              isLoading={busy}
              disabled={!meta.data.canChange || !reservation.live}
              onClick={() => void confirm()}
            >
              Confirmar intercambio sin cobro
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || reservation.action !== null}
              onClick={() => void reservation.change("liberar")}
            >
              Conservar el plan actual
            </Button>
          </div>
        </div>
      ) : meta.data.canChange ? (
        <div className="mt-4 grid gap-3">
          {admin ? (
            <>
              <Input
                label="Motivo de la reasignación"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
              <Select
                label="Destino del mismo tipo"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={busy}
              >
                <option value="">Asignación automática</option>
                {targets?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Modalidad"
              value={input.modalidad}
              onChange={(e) =>
                setInput((v) => ({
                  ...v,
                  modalidad: e.target.value as StudentScheduleSelection["modalidad"],
                }))
              }
            >
              <option value="entre_semana">Entre semana</option>
              <option value="fin_de_semana">Fin de semana</option>
            </Select>
            <Select
              label="Horas por día"
              value={input.horasPorDia}
              onChange={(e) =>
                setInput((v) => ({
                  ...v,
                  horasPorDia: Number(e.target.value),
                  horaInicio: Math.min(
                    v.horaInicio,
                    (limits.data?.endHour ?? 22) - Number(e.target.value),
                  ),
                }))
              }
            >
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
            <Input
              label="Hora inicial"
              type="number"
              min={6}
              max={(limits.data?.endHour ?? 22) - input.horasPorDia}
              step={1}
              value={input.horaInicio}
              onChange={(e) => setInput((v) => ({ ...v, horaInicio: Number(e.target.value) }))}
            />
          </div>
          <Input
            label="Mes de inicio"
            type="month"
            min={meta.data.serverNow ? localDate(meta.data.serverNow).slice(0, 7) : undefined}
            max={meta.data.calendarEndDate?.slice(0, 7)}
            value={selectedMonth}
            onChange={(e) => setMonth(e.target.value)}
          />
          {calendarKey && !currentCalendar ? (
            <p role="status">Consultando fechas disponibles…</p>
          ) : null}
          {currentCalendar?.error ? <p role="alert">{currentCalendar.error}</p> : null}
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Fechas de la propuesta">
            {currentCalendar?.data?.dias.map((day) => (
              <button
                className="rounded-sm border p-2 disabled:opacity-40 aria-pressed:bg-bg-sunken"
                type="button"
                key={day.fecha}
                disabled={!day.disponible || busy}
                aria-pressed={effective.fechaInicio === day.fecha}
                aria-label={dayLabel(day.fecha)}
                onClick={() => setInput((v) => ({ ...v, fechaInicio: day.fecha }))}
              >
                {Number(day.fecha.slice(-2))}
              </button>
            ))}
          </div>
          <p>
            Inicio propuesto:{" "}
            {effective.fechaInicio ? dayLabel(effective.fechaInicio) : "Selecciona una fecha"}.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !effective.fechaInicio}
            onClick={() => void propose()}
          >
            Consultar propuesta
          </Button>
          {summary ? (
            <>
              <p>
                {summarySentence({
                  primerDia: summary.dias[0].fecha,
                  horaInicio: summary.horaInicio,
                  ultimoDia: summary.ultimaFecha,
                  horaFin: summary.ultimaHoraFin,
                  horasTotales: summary.totalHoras,
                  dias: summary.dias.length,
                })}
              </p>
              <SchedulePlanView days={summary.dias.map((d) => ({ ...d, ok: true }))} />
              <Button type="button" isLoading={busy} onClick={() => void propose(true)}>
                Reservar propuesta sin soltar el plan actual
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <p role="status" className="mt-3">
          {meta.data.reason ??
            "El plan actual se conserva. No hay un cambio disponible en este estado."}
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
  courseType,
  onChanged,
}: {
  studentId: string;
  enrollmentId: string;
  courseType: "A" | "B";
  onChanged?: () => void;
}) {
  const cohorts = useFetch<Cohort[]>("/cohorts"),
    courses = useFetch<Course[]>("/courses");
  const targets = cohorts.data
    ?.filter((c) =>
      courses.data?.some((course) => course.id === c.courseId && course.tipo === courseType),
    )
    .map((c) => ({ id: c.id, label: `${c.nombre} · ${c.fechaInicioCurso} — ${c.fechaFinCurso}` }));
  return (
    <PlanChangePanel
      studentId={studentId}
      enrollmentId={enrollmentId}
      targets={targets}
      onChanged={onChanged}
    />
  );
}
