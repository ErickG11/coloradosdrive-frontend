"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFetch } from "@/hooks/useFetch";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";

import {
  ETIQUETA_ESTADO,
  etiquetaDocumento,
  formatearFechaLimite,
  textoPlazo,
} from "./documentosParaLlevar";

// Página de solo lectura: lo que el alumno lleva a la escuela. No hay subida de archivos.
export function StudentDocumentosParaLlevar() {
  const { data, isLoading, error, refetch } = useFetch<StudentEnrollmentState>(
    "/estudiantes/estado-inscripcion",
  );

  return (
    <section className="grid min-w-0 gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Documentos para llevar</h1>
        <p className="mt-2 text-text-secondary">
          Estos documentos se entregan en persona en la escuela. No necesitas subir nada en línea.
        </p>
      </header>
      {error ? (
        <div className="grid justify-items-start gap-3">
          <FormError>{error}</FormError>
          <Button className="min-h-11" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      ) : isLoading || !data ? (
        <p role="status">Cargando documentos…</p>
      ) : (
        <>
          {data.diasRestantes !== null && data.fechaLimite ? (
            <p role="status" className="text-sm">
              {textoPlazo(data.diasRestantes)} Fecha límite:{" "}
              {formatearFechaLimite(data.fechaLimite)}.
              {data.origen === "solicitud" ? (
                <span className="mt-1 block">
                  El plazo corresponde a tu primera práctica asignada.
                </span>
              ) : null}
            </p>
          ) : null}
          {data.identidadPresencial ? (
            <Card title="Verificación en persona">
              <StatusBadge
                status={data.identidadPresencial.confirmada ? "verificado" : "pendiente"}
                label={data.identidadPresencial.confirmada ? "Cédula verificada" : "Pendiente"}
              />
              <p className="mt-3 text-sm text-text-secondary">
                {data.identidadPresencial.confirmada
                  ? "Tu instructor comprobó tu cédula original en persona."
                  : "En tu primera clase tu instructor comprobará tu cédula original. Llévala contigo."}
              </p>
            </Card>
          ) : null}
          {data.documentosFisicos.length === 0 ? (
            <p>No hay documentos por llevar.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2" aria-label="Lista de documentos">
              {data.documentosFisicos.map((doc) => (
                <li key={doc.tipo}>
                  <Card title={doc.label ?? etiquetaDocumento(doc.tipo)} className="h-full">
                    <StatusBadge
                      status={doc.estado}
                      label={ETIQUETA_ESTADO[doc.estado] ?? doc.estado}
                    />
                    <p className="mt-3 text-sm text-text-secondary">
                      {doc.obligatorio ? "Obligatorio" : "Opcional"}
                    </p>
                    {doc.destacado ? (
                      <p className="mt-3 text-sm text-status-warning">
                        Presenta el carné de la Cruz Roja para completar tu tipo de sangre.
                      </p>
                    ) : null}
                    {doc.exento ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        No se exige para tu caso (por ejemplo, desde los 65 años cumplidos).
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
