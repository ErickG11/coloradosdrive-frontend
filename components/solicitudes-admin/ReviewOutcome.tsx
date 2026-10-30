"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useFetch } from "@/hooks/useFetch";
import type { SolicitudDecision } from "@/types/solicitud";
function AssignedCohort({ id }: { id: string }) {
  const { data } = useFetch<{ nombre: string }>(`/cohorts/${id}`);
  return (
    <p>
      Cohorte asignada:{" "}
      {data?.nombre ??
        "Asignada automáticamente; consulta la ficha del alumno para ver el detalle."}
    </p>
  );
}
export function ReviewOutcome({ decision }: { decision: SolicitudDecision }) {
  return (
    <Card title="Resultado de la revisión">
      {decision.estado === "aprobada" ? (
        <>
          {decision.cohorteAsignada?.cohortId ? (
            <AssignedCohort id={decision.cohorteAsignada.cohortId} />
          ) : (
            <p>Pendiente de cohorte. Puedes asignarla desde Alumnos.</p>
          )}
          {decision.studentId ? (
            <Link className="underline" href={`/admin/students/${decision.studentId}`}>
              Ver ficha del alumno
            </Link>
          ) : null}
        </>
      ) : (
        <p>Solicitud rechazada.</p>
      )}
      {decision.correoEnviado === false ? (
        <p role="alert" className="text-status-warning">
          La decisión se guardó, pero el correo no se pudo enviar. Contacta al postulante y gestiona
          el reenvío.
        </p>
      ) : null}
    </Card>
  );
}
