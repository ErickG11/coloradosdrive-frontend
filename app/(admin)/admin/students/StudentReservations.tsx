"use client";
import { Button, Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { ApiError } from "@/lib/api/errors";
import { studentActionError } from "@/lib/api/studentActions";
import type { StudentPracticeRecovery } from "@/types/student";

const reasons: Record<string, string> = {
  pasada: "La fecha de la práctica ya pasó.",
  ocupada: "La franja está ocupada.",
  instructor_no_disponible: "El instructor no está disponible.",
  solapamiento_alumno: "El alumno tiene otra práctica en ese horario.",
  franja_eliminada: "La franja ya no existe.",
  franja_modificada: "El horario, instructor o cohorte de la franja cambió.",
  matricula_no_vigente: "El alumno no tiene una matrícula vigente para esa franja.",
  ventana_cerrada: "La ventana para reservar esa práctica ya cerró.",
  error_reserva: "No se pudo recuperar la reserva. Requiere revisión.",
  reintentar_recuperacion: "No se pudo confirmar la recuperación. Requiere revisión.",
};
export function practiceRecoveryReason(reason: string | null) {
  return reason
    ? (reasons[reason] ?? "Motivo no disponible; requiere revisión.")
    : "Se intentará recuperar al reactivar al alumno.";
}
function localDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short" }).format(date);
}
export function StudentReservations({ id }: { id: string }) {
  const { data, isLoading, error, errorStatus, errorCode, refetch } = useFetch<
    StudentPracticeRecovery[]
  >(`/admin/estudiantes/${id}/reservas-pendientes`);
  return (
    <Card title="Reservas pendientes de reprogramar">
      {isLoading ? (
        <p role="status">Cargando reservas…</p>
      ) : error ? (
        <div role="alert" className="space-y-3 text-accent-red">
          <p>
            {
              studentActionError(
                new ApiError(error, errorStatus ?? 500, { code: errorCode ?? undefined }),
              ).message
            }
          </p>
          <Button variant="secondary" onClick={refetch}>
            Reintentar reservas
          </Button>
        </div>
      ) : !data?.length ? (
        <p>No hay reservas pendientes.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((row) => (
            <li key={row.slot_id} className="space-y-2 py-3 text-sm">
              <time dateTime={row.scheduled_at} className="font-medium">
                {localDate(row.scheduled_at)}
              </time>
              <p>
                {row.status === "cancelada_por_desactivacion"
                  ? "Cancelada por desactivación; pendiente de recuperación."
                  : "Pendiente de reprogramar."}
              </p>
              <p className="text-text-secondary">
                {row.reason
                  ? (reasons[row.reason] ?? "Motivo no disponible; requiere revisión.")
                  : "Se intentará recuperar al reactivar al alumno."}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
