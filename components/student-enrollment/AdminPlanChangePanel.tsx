"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { Cohort, Course } from "@/types";
import type {
  PlanChangeState,
  PlanChangePreview,
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
import { summarySentence } from "./scheduleFormat";
const options = () => ({ signal: AbortSignal.timeout(20_000), cache: "no-store" as const });
const localDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date(iso));
interface Props {
  enrollmentId: string;
  studentId: string;
  targets?: { id: string; label: string }[];
  onChanged?: () => void;
}
function AdminPlanChangeForm({ enrollmentId, studentId, targets, onChanged }: Props) {
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
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ key: string; data: PlanChangePreview } | null>(null);
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
  const key = JSON.stringify({
    effective,
    reason,
    target,
  });
  const calendarKey =
    meta.data?.active && meta.data.canChange && !pending && selectedMonth && input.horasPorDia
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
          ...(target ? { cohortId: target } : {}),
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
  }, [calendarKey, root, input.modalidad, input.horasPorDia, selectedMonth, target]);
  const currentCalendar = calendar?.key === calendarKey ? calendar : null;
  const hourKey =
    input.fechaInicio && input.horasPorDia && reason.trim()
      ? `${root}|${input.modalidad}|${input.horasPorDia}|${input.fechaInicio}|${reason}|${target}|${limits.data?.endHour}`
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
          motivo: reason.trim(),
          ...(target ? { cohortId: target } : {}),
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
  async function propose(reserve = false) {
    if (!reason.trim()) {
      setMessage("Escribe el motivo de la reasignación.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = {
        ...effective,
        motivo: reason.trim(),
        ...(target ? { cohortId: target } : {}),
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
      const url = `/admin/estudiantes/${studentId}/matriculas/cambio/${r.id}/confirmar`;
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
    <Card title="Reasignar plan del alumno" className="mt-4">
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
          (Guayaquil).
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
          <Button
            type="button"
            variant="secondary"
            disabled={
              busy || !effective.fechaInicio || !effective.horasPorDia || effective.horaInicio < 0
            }
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
    <AdminPlanChangeForm
      studentId={studentId}
      enrollmentId={enrollmentId}
      targets={targets}
      onChanged={onChanged}
    />
  );
}
