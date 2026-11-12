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
          className={`${visual.reservation} ${remaining <= 120 ? "border-status-warning" : ""}`}
          data-near-expiry={remaining <= 120}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">
                Horario reservado hasta {reservation.plan?.ultimaFecha ?? ""}
              </p>
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
          {live && reservation.estado !== "pago_en_curso" && remaining <= 120 ? (
            <p role="status" className="mt-3 text-status-warning">
              {reservation.purpose === "plan_change"
                ? "Quedan 2 minutos o menos para confirmar la propuesta."
                : "Quedan 2 minutos o menos para continuar con el pago."}
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
          {reservation.purpose === "plan_change"
            ? "La propuesta venció. Tu horario original se conserva; puedes consultar otra alternativa si aún estás dentro del plazo."
            : "Tu reserva venció y se liberaron las franjas y el cupo. Tu solicitud aprobada se conserva. Elige un horario nuevamente."}
        </p>
      ) : null}
      {state.error ? (
        <div className="grid gap-3">
          <p role="alert">{state.error}</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={state.refetch}
            disabled={state.checking}
          >
            Consultar reserva
          </Button>
        </div>
      ) : null}
    </>
  );
}
