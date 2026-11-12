"use client";
import { WaitlistControl } from "./WaitlistControl";
import { ScheduleDurationTable } from "./ScheduleDurationTable";
import visual from "@/components/inscripcion/enrollment-surface.module.css";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { studentScheduleApi, scheduleError } from "@/lib/api/studentSchedule";
import type {
  StudentPlanRules,
  StudentScheduleInput,
  StudentScheduleOptions,
  StudentSchedulePreview,
  StudentScheduleReservation,
} from "@/types/studentSchedule";
import { SchedulePlanView, type PlanDayView } from "./SchedulePlanView";
import { SegmentedControl } from "./SegmentedControl";
import { dayLabel, guayaquilDate, plural, summarySentence } from "./scheduleFormat";
import type { useStudentReservation } from "./useStudentReservation";
interface Props {
  onWaiting?: (waiting: boolean) => void;
  enrollmentId: string;
  state: ReturnType<typeof useStudentReservation>;
  onReserved: (reservation: StudentScheduleReservation) => void;
  onNext: () => void;
}
type Loaded<T> = { key: string; data?: T; error?: string } | null;
const reloadKey = (id: string | undefined) => id ?? "none";
const REASONS: Record<string, string> = {
  DIA_SIN_INSTRUCTOR: "Sin disponibilidad",
  SOLAPE_PROPIO: "Choca con tu agenda",
  SIN_COHORTE_ELEGIBLE: "Sin horarios disponibles",
};
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
}: Props) {
  const rules = useKeyedRequest<StudentPlanRules>(state.ready ? "plan-rules" : null, (signal) =>
    studentScheduleApi.rules(signal),
  );
  const minDate = rules.data?.active
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(
        new Date(rules.data.serverNow),
      )
    : guayaquilDate(0);
  const legacyMaxDate = guayaquilDate(365);
  const [draft, setInput] = useState<StudentScheduleInput>({
    modalidad: "entre_semana",
    fechaInicio: "",
    horasPorDia: 3,
  });
  const input = { ...draft, fechaInicio: draft.fechaInicio || minDate };
  const [selectedMonth, setMonth] = useState("");
  const month = selectedMonth || minDate.slice(0, 7);
  const calendar = useKeyedRequest(
    rules.data?.active && state.ready && !state.held
      ? `${enrollmentId}|${month}|${input.modalidad}|${input.horasPorDia}|${reloadKey(state.reservation?.id)}`
      : null,
    (signal) =>
      studentScheduleApi.calendar(enrollmentId, { ...input, fechaInicio: `${month}-01` }, signal),
  );
  const maxDate = rules.data?.active
    ? (calendar.data?.calendarEndDate ?? undefined)
    : legacyMaxDate;
  const [chosenHour, setChosenHour] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(input.fechaInicio) &&
    input.fechaInicio >= minDate &&
    (!maxDate || input.fechaInicio <= maxDate);
  const enabled = !!rules.data && state.ready && !state.held && !state.error && validDate;
  const optionsKey = enabled
    ? `${enrollmentId}|${input.modalidad}|${input.fechaInicio}|${String(input.horasPorDia)}|${String(reload)}`
    : null;
  const options = useKeyedRequest<StudentScheduleOptions>(optionsKey, (signal) =>
    studentScheduleApi.options(enrollmentId, input, signal),
  );
  useEffect(() => {
    if (options.data) onWaiting?.(Boolean(options.data.sinCohorte));
  }, [options.data, onWaiting]);
  const list = options.data?.horas ?? [];
  const firstFeasible = list.find((h) => h.factible)?.hora ?? null;
  // Preselecciona la primera hora factible; la elección del alumno solo vale si sigue siéndolo.
  const hour =
    chosenHour && list.some((h) => h.hora === chosenHour && h.factible)
      ? chosenHour
      : firstFeasible;
  // Sin ninguna hora factible se previsualiza la primera para explicar qué días fallan.
  const previewHour = hour ?? (options.data && !options.data.sinCohorte ? list[0]?.hora : null);
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
      <Card title="Tu horario reservado" className={visual.schedule}>
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

  const days: PlanDayView[] =
    data?.dias.map((d) => ({
      fecha: d.fecha,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      horas: d.horas,
      ok: d.disponible,
      motivo: d.motivo?.mensaje,
    })) ?? [];
  const failing = data?.diasFallan ?? [];
  const alternatives = list.filter((h) => h.factible && h.hora !== previewHour);
  const failure = options.error ?? preview.error ?? null;
  return (
    <Card title="Elige tu horario" className={visual.schedule}>
      {rules.data ? <ScheduleDurationTable rules={rules.data} /> : null}
      {rules.error ? (
        <p role="status" className="text-status-warning">
          {rules.error}
        </p>
      ) : null}
      <p className="mb-5 text-text-secondary">
        Elige cuándo empiezas y a qué hora. Nosotros armamos el resto: todos los días tendrás la
        misma hora de inicio hasta completar tus horas de práctica.
      </p>
      {expired ? (
        <p role="status" className="mb-4 rounded-sm bg-status-warning-bg p-3 text-status-warning">
          {expired}
        </p>
      ) : null}
      <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SegmentedControl
          legend="Modalidad"
          value={input.modalidad}
          disabled={reserving}
          options={[
            { value: "entre_semana", label: "Entre semana" },
            { value: "fin_de_semana", label: "Fin de semana" },
          ]}
          onChange={(modalidad) => update({ modalidad })}
        />
        {rules.data?.active ? (
          <div className="grid gap-2">
            <Input
              label="Mes de inicio"
              type="month"
              min={minDate.slice(0, 7)}
              max={maxDate?.slice(0, 7)}
              value={month}
              disabled={reserving}
              onChange={(e) => setMonth(e.target.value)}
            />
            <p className="text-sm">
              Solo se habilitan fechas con un plan completo disponible. La reserva confirma el cupo.
            </p>
            {calendar.loading ? <p role="status">Consultando fechas…</p> : null}
            {calendar.error ? <p role="alert">{calendar.error}</p> : null}
            <div
              className="grid grid-cols-7 gap-1"
              role="group"
              aria-label="Fechas de inicio disponibles"
            >
              {calendar.data?.dias.map((day) => (
                <button
                  key={day.fecha}
                  type="button"
                  disabled={reserving || !day.disponible}
                  aria-pressed={input.fechaInicio === day.fecha}
                  aria-label={`${dayLabel(day.fecha)}${day.motivo ? `: ${day.motivo}` : ""}`}
                  title={day.motivo ?? undefined}
                  className="rounded-sm border p-2 disabled:opacity-40 aria-pressed:bg-bg-sunken"
                  onClick={() => update({ fechaInicio: day.fecha })}
                >
                  {Number(day.fecha.slice(-2))}
                </button>
              ))}
            </div>
            <ul
              className="text-sm text-text-secondary"
              aria-label="Motivos de fechas no disponibles"
            >
              {calendar.data?.dias
                .filter((day) => !day.disponible && day.motivo)
                .map((day) => (
                  <li key={day.fecha}>
                    {dayLabel(day.fecha)}: {day.motivo}
                  </li>
                ))}
            </ul>
            <p aria-live="polite">Fecha seleccionada: {dayLabel(input.fechaInicio)}</p>
          </div>
        ) : (
          <Input
            label="Fecha de inicio"
            type="date"
            required
            min={minDate}
            max={maxDate}
            value={input.fechaInicio}
            disabled={reserving}
            onChange={(e) => update({ fechaInicio: e.target.value })}
            error={
              input.fechaInicio && !validDate
                ? "Elige una fecha desde hoy con horas futuras."
                : undefined
            }
          />
        )}
        <SegmentedControl
          legend="Horas por día"
          value={input.horasPorDia}
          disabled={reserving}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
          onChange={(horasPorDia) => update({ horasPorDia })}
        />
      </div>
      <fieldset className="mt-6 min-w-0" disabled={reserving}>
        <legend className="mb-2 text-sm font-medium text-text-secondary">Hora de inicio</legend>
        {options.loading || (!options.data && !failure && enabled) ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
            <span className="sr-only" role="status">
              Buscando horas disponibles…
            </span>
          </div>
        ) : !validDate ? (
          <p className="text-text-secondary">Elige una fecha de inicio para ver las horas.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {list.map((item) => {
              const selected = item.hora === hour;
              const reason = item.motivo ? (REASONS[item.motivo.codigo] ?? "No disponible") : null;
              return (
                <button
                  key={item.hora}
                  type="button"
                  disabled={!item.factible}
                  aria-pressed={selected}
                  aria-label={
                    item.factible
                      ? `${item.hora}${selected ? ", seleccionada" : ""}`
                      : `${item.hora}, no disponible. ${item.motivo?.mensaje ?? ""}`
                  }
                  title={item.motivo?.mensaje}
                  onClick={() => {
                    setChosenHour(item.hora);
                    setReserveError(null);
                  }}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-sm border px-2 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-brand-primary bg-brand-primary text-white" : "border-border-strong bg-bg-surface text-text-primary hover:bg-bg-sunken"}`}
                >
                  {item.hora}
                  {reason ? (
                    <span className="text-[11px] font-normal leading-tight">{reason}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
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
        <div role="status" className="mt-5 rounded-sm border border-border p-4">
          <p className="font-medium">No hay horarios disponibles para esas fechas.</p>
          <p className="mt-1 text-text-secondary">
            Prueba empezar más tarde o consulta a la escuela.
          </p>
          <WaitlistControl enrollmentId={enrollmentId} input={input} />
          {noCohort.primeraFechaPosible ? (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => update({ fechaInicio: noCohort.primeraFechaPosible ?? minDate })}
            >
              Empezar el {dayLabel(noCohort.primeraFechaPosible)}
            </Button>
          ) : null}
        </div>
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
      {data ? (
        <section className="mt-6" aria-labelledby="plan-title">
          <h3 id="plan-title" className="font-display text-lg font-semibold">
            Tu plan
          </h3>
          <p className="mt-2 font-medium" aria-live="polite" aria-atomic="true">
            {summarySentence({
              primerDia: data.fechaInicioEfectiva,
              horaInicio: data.horaInicio,
              ultimoDia: data.ultimaFecha,
              horaFin: data.ultimaHoraFin,
              horasTotales: data.horasTotales,
              dias: data.dias.length,
            })}
          </p>
          {data.ajustada ? (
            <p className="mt-1 text-sm text-text-secondary">
              La fecha que elegiste no es de esta modalidad; empezamos el{" "}
              {dayLabel(data.fechaInicioEfectiva)}.
            </p>
          ) : null}
          {data.precioCentavos !== undefined ? (
            <p className="mt-3 font-semibold">
              Precio del curso:{" "}
              {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                data.precioCentavos / 100,
              )}
              . Se fija al reservar.
            </p>
          ) : null}
          <SchedulePlanView days={days} />
          {failing.length ? (
            <div role="alert" className="mt-4 text-sm text-accent-red">
              <p className="font-medium">
                Esta hora no se puede reservar: falta disponibilidad en{" "}
                {plural(failing.length, "día", "días")}.
              </p>
              <p className="mt-1 text-sm">{failing.map(dayLabel).join(", ")}.</p>
              {alternatives.length ? (
                <p className="mt-2 text-sm">
                  Prueba con: {alternatives.map((a) => a.hora).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {reserveError ? (
        <p role="alert" className="mt-4 text-status-error">
          {reserveError}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-text-secondary">
          El cupo se confirma al reservar. No necesitas elegir instructor.
        </p>
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
          Reservar este horario
        </Button>
      </div>
    </Card>
  );
}
