"use client";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import { EnrollmentIcon } from "@/components/inscripcion/EnrollmentVisual";
import { NoOpenCoursePanel, WaitlistControl } from "./WaitlistControl";
import planStyles from "./enrollment-plan.module.css";
import visual from "@/components/inscripcion/enrollment-surface.module.css";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanFields, timeRange } from "./PlanFields";
import { studentScheduleApi, scheduleError } from "@/lib/api/studentSchedule";
import type {
  StudentPlanRules,
  StudentScheduleInput,
  StudentScheduleOptions,
  StudentSchedulePreview,
  StudentScheduleReservation,
} from "@/types/studentSchedule";
import { SchedulePlanView, type PlanDayView } from "./SchedulePlanView";

import { dayLabel, dayLabelLong, guayaquilDate, plural, summarySentence } from "./scheduleFormat";
import type { useStudentReservation } from "./useStudentReservation";
interface Props {
  onWaiting?: (waiting: boolean) => void;
  enrollmentId: string;
  state: ReturnType<typeof useStudentReservation>;
  onReserved: (reservation: StudentScheduleReservation) => void;
  onNext: () => void;
  onBack?: () => void;
}
type Loaded<T> = { key: string; data?: T; error?: string } | null;
const reloadKey = (id: string | undefined) => id ?? "none";
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-sm bg-bg-sunken motion-safe:animate-pulse ${className}`}
    />
  );
}
// Carga con clave: «cargando» es derivado (la clave del resultado no coincide con la
// consulta actual), así una respuesta tardía de otros parámetros nunca se muestra.
function useKeyedRequest<T>(
  key: string | null,
  run: (signal: AbortSignal) => Promise<T>,
): { loading: boolean; data: T | undefined; error: string | undefined } {
  const [result, setResult] = useState<Loaded<T>>(null);
  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 15_000);
    run(abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setResult({ key, data });
      })
      .catch((err: unknown) => {
        if (!abort.signal.aborted) setResult({ key, error: scheduleError(err) });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
    };
    // `run` cambia en cada render; la clave describe exactamente sus entradas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = key !== null && result?.key === key ? result : null;
  return {
    loading: key !== null && current === null,
    data: current?.data,
    error: current?.error,
  };
}
export function StudentSchedulePicker({
  onWaiting,
  enrollmentId,
  state,
  onReserved,
  onNext,
  onBack,
}: Props) {
  const rules = useKeyedRequest<StudentPlanRules>(state.ready ? "plan-rules" : null, (signal) =>
    studentScheduleApi.rules(signal),
  );
  const minDate = rules.data
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(
        new Date(rules.data.serverNow),
      )
    : guayaquilDate(0);
  const legacyMaxDate = guayaquilDate(365);
  const [draft, setInput] = useState<StudentScheduleInput>({
    modalidad: "entre_semana",
    fechaInicio: "",
    horasPorDia: 0,
  });
  const input = draft;
  const calendarHours =
    input.horasPorDia ||
    rules.data?.options.find((o) => o.habilitada && o.modalidad === input.modalidad)?.horasPorDia ||
    0;
  const [selectedMonth, setMonth] = useState("");
  const month = selectedMonth || minDate.slice(0, 7);
  const [chosenHour, setChosenHour] = useState<string | null>(null);
  const calendar = useKeyedRequest(
    rules.data && calendarHours && state.ready && !state.held
      ? `${enrollmentId}|${month}|${input.modalidad}|${calendarHours}|${reloadKey(state.reservation?.id)}`
      : null,
    (signal) =>
      studentScheduleApi
        .calendar(
          enrollmentId,
          { ...input, horasPorDia: calendarHours, fechaInicio: `${month}-01` },
          signal,
        )
        .then((result) => {
          if (!signal.aborted) {
            const day = result.dias.find((d) => d.fecha === input.fechaInicio);
            if (day && !day.disponible) {
              setInput((current) =>
                current.fechaInicio === input.fechaInicio &&
                current.modalidad === input.modalidad &&
                current.horasPorDia === calendarHours
                  ? { ...current, fechaInicio: "" }
                  : current,
              );
              setChosenHour(null);
            }
          }
          return result;
        }),
  );
  const maxDate = rules.data?.active
    ? (calendar.data?.calendarEndDate ?? undefined)
    : legacyMaxDate;
  const [reload, setReload] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(input.fechaInicio) &&
    input.fechaInicio >= minDate &&
    (!maxDate || input.fechaInicio <= maxDate);
  const enabled =
    !!rules.data &&
    state.ready &&
    !state.held &&
    !state.error &&
    validDate &&
    input.horasPorDia > 0;
  const optionsKey = enabled
    ? `${enrollmentId}|${input.modalidad}|${input.fechaInicio}|${String(input.horasPorDia)}|${String(reload)}`
    : null;
  const options = useKeyedRequest<StudentScheduleOptions>(optionsKey, (signal) =>
    studentScheduleApi.options(enrollmentId, input, signal).then((result) => {
      if (
        !signal.aborted &&
        chosenHour &&
        !result.horas.some((h) => h.hora === chosenHour && h.factible)
      )
        setChosenHour(null);
      return result;
    }),
  );
  // Sin ningún curso abierto: el servidor lo indica en las opciones o en todos los días futuros.
  const futureDays = (calendar.data?.dias ?? []).filter((d) => d.fecha >= minDate);
  const noOpen =
    options.data?.sinCohorte?.codigo === "SIN_CURSOS_ABIERTOS" ||
    (futureDays.length > 0 &&
      futureDays.every((d) => !d.disponible && /cursos abiertos/i.test(d.motivo ?? "")));
  useEffect(() => {
    if (options.data || noOpen) onWaiting?.(noOpen || Boolean(options.data?.sinCohorte));
  }, [options.data, noOpen, onWaiting]);
  const list = options.data?.horas ?? [];
  const firstFeasible = list.find((h) => h.factible)?.hora ?? null;
  const hour =
    chosenHour && list.some((h) => h.hora === chosenHour && h.factible) ? chosenHour : null;
  const previewHour = hour ?? firstFeasible;
  const previewKey =
    optionsKey && options.data && previewHour ? `${optionsKey}|${previewHour}` : null;
  const preview = useKeyedRequest<StudentSchedulePreview>(previewKey, (signal) =>
    studentScheduleApi.preview(
      enrollmentId,
      { ...input, horaInicio: Number(previewHour?.slice(0, 2)) },
      signal,
    ),
  );
  function update(next: Partial<StudentScheduleInput>) {
    setInput((current) => ({ ...current, ...next }));
    if (
      next.modalidad !== undefined ||
      next.horasPorDia !== undefined ||
      next.fechaInicio !== undefined
    )
      setChosenHour(null);
    setReserveError(null);
  }
  async function reserve() {
    if (!preview.data?.factible || reserving || !hour) return;
    setReserving(true);
    setReserveError(null);
    try {
      onReserved(
        await studentScheduleApi.reserve(enrollmentId, {
          ...input,
          horaInicio: Number(hour.slice(0, 2)),
        }),
      );
    } catch (err) {
      setReserveError(scheduleError(err));
      // Una respuesta incierta puede haber creado una reserva. Consultar antes de reintentar.
      setReload((n) => n + 1);
      state.refetch();
    } finally {
      setReserving(false);
    }
  }
  if (state.held && state.reservation) {
    const plan = state.reservation.plan;
    const days: PlanDayView[] = plan?.dias.map((d) => ({ ...d, ok: true })) ?? [];
    return (
      <Card title="Tu horario reservado" className={`${visual.schedule} ${planStyles.schedule}`}>
        <p className="font-semibold">Tu plan de prácticas</p>
        {plan ? (
          <p className="mt-2" aria-live="polite">
            {summarySentence({
              primerDia: plan.dias[0].fecha,
              horaInicio: plan.horaInicio,
              ultimoDia: plan.ultimaFecha,
              horaFin: plan.ultimaHoraFin,
              horasTotales: plan.totalHoras,
              dias: plan.dias.length,
            })}
          </p>
        ) : null}
        <p className="mt-2 text-text-secondary">
          Te asignaremos al instructor después del pago. Este horario está retenido mientras corre
          el contador.
        </p>
        <SchedulePlanView days={days} />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={!state.live || !!state.error || state.checking || state.action !== null}
            onClick={onNext}
          >
            Continuar al pago
          </Button>
          <Button
            variant="secondary"
            disabled={
              state.reservation.estado === "pago_en_curso" || !state.live || state.action !== null
            }
            onClick={() => setConfirmRelease(true)}
          >
            Cambiar horario
          </Button>
        </div>
        {confirmRelease ? (
          <div className="mt-4 rounded-sm border border-border p-4">
            <p>
              Se liberará este horario y podrás elegir otro. Esta reserva seguirá contando para el
              límite diario.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                isLoading={state.action === "liberar"}
                disabled={state.action !== null}
                onClick={() => {
                  setConfirmRelease(false);
                  void state.change("liberar");
                }}
              >
                Sí, liberar
              </Button>
              <Button
                variant="secondary"
                disabled={state.action !== null}
                onClick={() => setConfirmRelease(false)}
              >
                Conservar reserva
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    );
  }
  const expired =
    state.reservation?.estado === "vencida"
      ? "Tu reserva venció y el horario se liberó. Elige uno nuevo para continuar."
      : null;
  const data = preview.data;
  const noCohort = options.data?.sinCohorte ?? null;

  const failure = options.error ?? preview.error ?? null;
  if (noOpen)
    return (
      <Card title="Elige tu horario" className={`${visual.schedule} ${planStyles.schedule}`}>
        <NoOpenCoursePanel enrollmentId={enrollmentId} />
      </Card>
    );
  return (
    <Card title="Elige tu horario" className={`${visual.schedule} ${planStyles.schedule}`}>
      {rules.error ? (
        <p role="status" className="text-status-warning">
          {rules.error}
        </p>
      ) : null}
      {expired ? (
        <p role="status" className="mb-4 rounded-sm bg-status-warning-bg p-3 text-status-warning">
          {expired}
        </p>
      ) : null}
      <PlanFields
        appearance="enrollment"
        rules={rules.data}
        value={{ ...input, horaInicio: hour ? Number(hour.slice(0, 2)) : -1 }}
        month={month}
        onMonth={setMonth}
        minDate={minDate}
        maxDate={maxDate}
        days={calendar.data?.dias ?? []}
        hours={list}
        disabled={reserving}
        loading={calendar.loading || options.loading}
        onChange={(next) => {
          const changed =
            next.modalidad !== input.modalidad ||
            next.horasPorDia !== input.horasPorDia ||
            next.fechaInicio !== input.fechaInicio;
          if (changed)
            update({
              modalidad: next.modalidad,
              horasPorDia: next.horasPorDia,
              fechaInicio: next.fechaInicio,
            });
          setChosenHour(
            next.horaInicio < 0 ? null : `${String(next.horaInicio).padStart(2, "0")}:00`,
          );
        }}
      />
      {calendar.error ? <p role="alert">{calendar.error}</p> : null}
      {failure ? (
        <div role="alert" className="mt-5 text-sm text-accent-red">
          <p>{failure}</p>
          <Button className="mt-3" variant="secondary" onClick={() => setReload((n) => n + 1)}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {state.error && !failure ? (
        <p role="alert" className="mt-5 text-status-error">
          {state.error}
        </p>
      ) : null}
      {noCohort ? (
        <StudentEmptyState
          icon={<EnrollmentIcon name="calendar" />}
          title={
            noCohort.codigo === "SIN_COHORTE_ELEGIBLE"
              ? "Los cursos abiertos están completos"
              : "Aún no hay un plan disponible para estas fechas"
          }
          description={noCohort.mensaje}
          actions={
            <div className="grid gap-3">
              {noCohort.ultimaFechaInicioPosible &&
              !noCohort.mensaje.includes("Última fecha de inicio") ? (
                <p className="text-sm text-text-secondary">
                  La última fecha de inicio posible es el{" "}
                  {dayLabelLong(noCohort.ultimaFechaInicioPosible)}.
                </p>
              ) : null}
              <WaitlistControl enrollmentId={enrollmentId} input={input} />
              {noCohort.primeraFechaPosible ? (
                <Button
                  variant="secondary"
                  onClick={() => update({ fechaInicio: noCohort.primeraFechaPosible ?? minDate })}
                >
                  Empezar el {dayLabel(noCohort.primeraFechaPosible)}
                </Button>
              ) : null}
            </div>
          }
        />
      ) : null}
      {options.data && !noCohort && !firstFeasible ? (
        <div role="status" className="mt-5 rounded-sm border border-border p-4">
          <p className="font-medium">No encontramos una hora con todos los días disponibles.</p>
          <p className="mt-1 text-text-secondary">
            Prueba otra fecha de inicio, otra cantidad de horas por día o la otra modalidad.
          </p>
        </div>
      ) : null}
      {preview.loading ? (
        <div className="mt-5 grid gap-2" aria-busy="true">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {reserveError ? (
        <p role="alert" className="mt-4 text-status-error">
          {reserveError}
        </p>
      ) : null}
      <div
        className={`${planStyles.planSummary} sticky bottom-0 z-10 mt-6 grid items-center gap-3 border-t border-border bg-bg-surface p-3 shadow-elevated`}
        data-flow-actions
        aria-label="Resumen del plan"
      >
        <div className="min-w-0 flex-1 text-sm" aria-live="polite">
          <p>
            {data
              ? `Tu plan: ${dayLabel(data.dias[0]?.fecha ?? data.fechaInicioEfectiva)} al ${dayLabel(data.ultimaFecha)} · ${plural(data.dias.length, "día", "días")} · ${hour ? timeRange(hour, input.horasPorDia) : "Seleccione un horario"} · ${data.horasTotales} horas en total`
              : "Tu plan: selecciona las horas por día, la fecha y el horario."}
          </p>
          {data?.precioCentavos !== undefined ? (
            <p>
              Precio del curso:{" "}
              {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                data.precioCentavos / 100,
              )}
              . Se fija al reservar.
            </p>
          ) : null}
        </div>
        {onBack ? (
          <Button variant="secondary" disabled={reserving} onClick={onBack}>
            Volver
          </Button>
        ) : null}
        <Button
          isLoading={reserving}
          disabled={
            !data?.factible ||
            !hour ||
            reserving ||
            !!state.error ||
            state.checking ||
            preview.loading
          }
          onClick={() => void reserve()}
        >
          Continuar
        </Button>
      </div>
    </Card>
  );
}
