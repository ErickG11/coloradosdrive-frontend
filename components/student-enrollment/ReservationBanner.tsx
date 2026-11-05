"use client";
import visual from "@/components/inscripcion/enrollment-surface.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { useStudentReservation } from "./useStudentReservation";
type Props = { state: ReturnType<typeof useStudentReservation> };
export function ReservationBanner({ state }: Props) {
  const { reservation, remaining, held, live, action } = state;
  return (
    <>
      {held && reservation ? (
        <Card
          className={`${visual.reservation} ${remaining <= 300 ? "border-status-warning" : ""}`}
          data-near-expiry={remaining <= 300}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Horario reservado · {reservation.cohorte.nombre}</p>
              <p
                role="timer"
                aria-label="Tiempo restante de la reserva"
                aria-live="off"
                className="mt-1 font-mono text-xl tabular-nums"
              >
                {Math.floor(remaining / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(remaining % 60).toString().padStart(2, "0")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                El servidor confirma el vencimiento de tu reserva.
              </p>
            </div>
            {reservation.puedeAmpliar && live ? (
              <Button
                variant="secondary"
                isLoading={action === "ampliar"}
                disabled={action !== null || state.checking}
                onClick={() => void state.change("ampliar")}
              >
                Ampliar reserva
              </Button>
            ) : null}
          </div>
          {live && remaining <= 300 ? (
            <p role="status" className="mt-3 text-status-warning">
              Quedan 5 minutos o menos. Amplía tu reserva si aún tienes esa opción.
            </p>
          ) : null}
          {!live ? (
            <p role="status" className="mt-3">
              Verificando si la reserva sigue vigente…
            </p>
          ) : null}
          {reservation.estado === "pago_en_curso" ? (
            <p className="mt-3">Pago en curso. Espera el resultado antes de cambiar tu horario.</p>
          ) : null}
        </Card>
      ) : reservation?.estado === "vencida" ? (
        <p role="status" className="rounded-sm border border-status-warning p-4">
          Tu reserva venció y se liberaron las franjas y el cupo. Tu solicitud aprobada se conserva.
          Elige un horario nuevamente.
        </p>
      ) : null}
      {state.error ? (
        <Card>
          <p role="alert">{state.error}</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={state.refetch}
            disabled={state.checking}
          >
            Consultar reserva
          </Button>
        </Card>
      ) : null}
    </>
  );
}
