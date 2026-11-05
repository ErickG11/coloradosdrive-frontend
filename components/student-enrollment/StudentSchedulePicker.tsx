"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { studentScheduleApi, scheduleError } from "@/lib/api/studentSchedule";
import type {
  StudentScheduleAvailability,
  StudentScheduleInput,
  StudentScheduleReservation,
} from "@/types/studentSchedule";
import type { useStudentReservation } from "./useStudentReservation";
type Selection = { fecha: string; hora: string };
interface Props {
  enrollmentId: string;
  state: ReturnType<typeof useStudentReservation>;
  onReserved: (reservation: StudentScheduleReservation) => void;
  onNext: () => void;
}
function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(`${date}T12:00:00-05:00`));
}
function slotLabel(scheduled: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(scheduled));
}
export function StudentSchedulePicker({ enrollmentId, state, onReserved, onNext }: Props) {
  const [input, setInput] = useState<StudentScheduleInput>({
    modalidad: "entre_semana",
    fechaInicio: "",
    horasPorDia: 3,
  });
  const [availability, setAvailability] = useState<StudentScheduleAvailability | null>(null);
  const [selection, setSelection] = useState<Selection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"consultar" | "reservar" | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      request.current++;
    },
    [],
  );
  function update(next: StudentScheduleInput) {
    request.current++;
    controller.current?.abort();
    setInput(next);
    setAvailability(null);
    setSelection([]);
    setError(null);
    setBusy(null);
  }
  async function search(event?: FormEvent) {
    event?.preventDefault();
    const sequence = ++request.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 15_000);
    setBusy("consultar");
    setError(null);
    setSelection([]);
    setAvailability(null);
    try {
      const result = await studentScheduleApi.availability(enrollmentId, input, abort.signal);
      if (request.current === sequence) setAvailability(result);
    } catch (err) {
      if (request.current === sequence) {
        setError(scheduleError(err));
        state.refetch();
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === sequence) setBusy(null);
    }
  }
  function toggle(fecha: string, hora: string, maximum: number) {
    setSelection((current) =>
      current.some((s) => s.fecha === fecha && s.hora === hora)
        ? current.filter((s) => s.fecha !== fecha || s.hora !== hora)
        : current.filter((s) => s.fecha === fecha).length < maximum
          ? [...current, { fecha, hora }]
          : current,
    );
  }
  const complete =
    availability?.disponible &&
    availability.dias.every(
      (day) => selection.filter((s) => s.fecha === day.fecha).length === day.horasASeleccionar,
    );
  async function reserve() {
    if (!complete || busy) return;
    setBusy("reservar");
    setError(null);
    try {
      const result = await studentScheduleApi.reserve(enrollmentId, input, selection);
      onReserved(result);
    } catch (err) {
      setError(scheduleError(err));
      // Una respuesta incierta puede haber creado una reserva. Consultar antes de reintentar.
      setAvailability(null);
      setSelection([]);
      state.refetch();
    } finally {
      setBusy(null);
    }
  }
  if (state.held && state.reservation)
    return (
      <Card title="Tu horario reservado">
        <p className="font-semibold">Cohorte: {state.reservation.cohorte.nombre}</p>
        <p className="mt-2 text-text-secondary">
          La asignación del instructor se mostrará después del pago.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {state.reservation.franjas.map((s) => (
            <li key={s.scheduledAt}>{slotLabel(s.scheduledAt)} · 1 hora</li>
          ))}
        </ul>
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
            Liberar horario
          </Button>
        </div>
        {confirmRelease ? (
          <div className="mt-4 rounded-sm border border-border p-4">
            <p>
              Se liberarán todas las franjas y el cupo. Esta reserva seguirá contando para el límite
              diario.
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
  return (
    <Card title="Elige tu horario">
      <p className="mb-5 text-text-secondary">
        Selecciona las horas de cada día, como las butacas de un cine. Reservaremos todo el plan a
        la vez.
      </p>
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(event) => void search(event)}>
        <Select
          label="Modalidad"
          value={input.modalidad}
          disabled={busy === "reservar"}
          onChange={(e) =>
            update({ ...input, modalidad: e.target.value as StudentScheduleInput["modalidad"] })
          }
        >
          <option value="entre_semana">Entre semana</option>
          <option value="fin_de_semana">Fin de semana</option>
        </Select>
        <Input
          label="Fecha de inicio"
          type="date"
          required
          value={input.fechaInicio}
          disabled={busy === "reservar"}
          onChange={(e) => update({ ...input, fechaInicio: e.target.value })}
        />
        <Select
          label="Horas por día"
          value={input.horasPorDia}
          disabled={busy === "reservar"}
          onChange={(e) => update({ ...input, horasPorDia: Number(e.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "hora" : "horas"}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          className="justify-self-start sm:col-span-3"
          isLoading={busy === "consultar"}
          disabled={!state.ready || state.checking || !!state.error || busy === "reservar"}
        >
          Consultar disponibilidad
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-4 text-status-error">
          {error}
        </p>
      ) : null}
      {availability ? (
        <>
          <p className="mt-5 font-semibold">
            {availability.horasRequeridas} horas de práctica · {selection.length} seleccionadas
          </p>
          {availability.mensaje ? (
            <p role="status" className="mt-3">
              {availability.mensaje}
            </p>
          ) : null}
          {availability.fechasSugeridas.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span>Prueba estos inicios:</span>
              {availability.fechasSugeridas.map((date) => (
                <Button
                  variant="secondary"
                  key={date}
                  onClick={() => update({ ...input, fechaInicio: date })}
                >
                  {dateLabel(date)}
                </Button>
              ))}
            </div>
          ) : null}
          <p id="schedule-help" className="mt-4 text-sm text-text-secondary">
            Cada casilla equivale a una hora. Elige la cantidad indicada por día. El último día
            puede tener menos horas. Las casillas ocupadas no se pueden elegir.
          </p>
          <div
            className="mt-4 overflow-x-auto rounded-sm border border-border"
            tabIndex={0}
            aria-label="Tabla de horas disponibles"
          >
            <table
              className="w-full border-collapse text-center text-sm"
              aria-describedby="schedule-help"
            >
              <caption className="sr-only">
                Disponibilidad de prácticas, días por columna y horas por fila
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="p-3">
                    Hora
                  </th>
                  {availability.dias.map((day) => (
                    <th scope="col" className="min-w-32 p-3" key={day.fecha}>
                      {dateLabel(day.fecha)}
                      <span className="mt-1 block font-normal">Elige {day.horasASeleccionar}h</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 16 }, (_, row) => (
                  <tr key={row}>
                    <th scope="row" className="p-2">
                      {String(row + 6).padStart(2, "0")}:00
                    </th>
                    {availability.dias.map((day) => {
                      const slot = day.franjas[row];
                      const chosen = selection.some(
                        (s) => s.fecha === day.fecha && s.hora === slot.hora,
                      );
                      const full =
                        !chosen &&
                        selection.filter((s) => s.fecha === day.fecha).length >=
                          day.horasASeleccionar;
                      return (
                        <td className="border-t border-border p-1" key={day.fecha}>
                          <Button
                            className="min-h-11 w-full"
                            size="sm"
                            variant={chosen ? "primary" : "secondary"}
                            aria-pressed={chosen}
                            aria-label={`${dateLabel(day.fecha)}, ${slot.hora}, ${chosen ? "seleccionada" : slot.libre ? "libre" : "ocupada"}`}
                            disabled={
                              !slot.libre || full || busy !== null || !availability.disponible
                            }
                            onClick={() => toggle(day.fecha, slot.hora, day.horasASeleccionar)}
                          >
                            {chosen ? "Elegido" : slot.libre ? "Libre" : "Ocupado"}
                          </Button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p>El cupo se confirma al reservar. No necesitas elegir instructor.</p>
            <Button
              isLoading={busy === "reservar"}
              disabled={!complete || busy !== null || !!state.error || state.checking}
              onClick={() => void reserve()}
            >
              Reservar horario
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
