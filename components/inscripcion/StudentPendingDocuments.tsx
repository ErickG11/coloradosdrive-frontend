"use client";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { useFetch } from "@/hooks/useFetch";
import { DOCUMENTOS, type DocumentoTipo } from "@/types/solicitud";
interface PendingDocuments {
  documentosPendientes: DocumentoTipo[];
  fechaLimite: string | null;
  diasRestantes: number | null;
  cohortePendiente: boolean;
}
export function StudentPendingDocuments() {
  const { data, isLoading, error, refetch } = useFetch<PendingDocuments>(
    "/estudiantes/documentos-pendientes",
  );
  useEffect(() => {
    if (!data?.documentosPendientes?.length) return;
    const timer = setInterval(refetch, 60000);
    return () => clearInterval(timer);
  }, [refetch, data?.documentosPendientes?.length]);
  if (isLoading) return null;
  if (error)
    return (
      <Card title="Documentos pendientes" className="relative z-10 mt-5">
        <FormError>{error}</FormError>
        <Button className="min-h-11" onClick={refetch} variant="secondary">
          Reintentar documentos
        </Button>
      </Card>
    );
  if (!data?.documentosPendientes?.length) return null;
  const days = data.diasRestantes;
  return (
    <Card title="Documentos pendientes" className="relative z-10 mt-5">
      <p className="text-sm text-text-secondary">Entrega estos documentos físicos en la escuela:</p>
      <ul className="mt-3 list-inside list-disc text-sm">
        {data.documentosPendientes.map((tipo) => (
          <li key={tipo}>{DOCUMENTOS.find((d) => d.tipo === tipo)?.label ?? tipo}</li>
        ))}
      </ul>
      {data.cohortePendiente ? (
        <p className="mt-3 text-sm">
          Tu matrícula está pendiente de cohorte. La escuela te asignará una y confirmará el plazo.
        </p>
      ) : null}
      {days !== null && data.fechaLimite ? (
        <p className="mt-3 text-sm" role="status">
          {days > 0
            ? `Te quedan ${days} días para entregar los documentos físicos.`
            : days === 0
              ? "Hoy cierra la matrícula de tu cohorte. Entrega tus documentos físicos."
              : `El plazo de matrícula venció hace ${Math.abs(days)} días. Contacta a la escuela para entregar lo pendiente.`}{" "}
          Fecha límite:{" "}
          {new Date(`${data.fechaLimite}T12:00:00-05:00`).toLocaleDateString("es-EC", {
            timeZone: "America/Guayaquil",
          })}
          .
        </p>
      ) : null}
      <p className="mt-3 text-sm text-text-secondary">
        Puedes entregar faltantes incluso con el curso iniciado. El administrador actualizará el
        checklist.
      </p>
    </Card>
  );
}
