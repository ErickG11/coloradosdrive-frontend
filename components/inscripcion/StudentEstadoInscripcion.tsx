"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { useFetch } from "@/hooks/useFetch";
import type { EstadoInscripcionAlumno } from "@/types/inscripcion";

import {
  documentosPorLlevar,
  etiquetaDocumento,
  formatearFechaLimite,
  textoPlazo,
} from "./documentosParaLlevar";

// Bloque de estado en el inicio del alumno. Solo lectura: el alumno no sube nada.
export function StudentEstadoInscripcion() {
  const { data, isLoading, error, refetch } = useFetch<EstadoInscripcionAlumno>(
    "/estudiantes/estado-inscripcion",
  );

  if (isLoading) return null;
  if (error) {
    return (
      <Card title="Estado de tu inscripción" className="relative z-10 mt-5">
        <FormError>{error}</FormError>
        <Button className="mt-3 min-h-11" onClick={refetch} variant="secondary">
          Reintentar
        </Button>
      </Card>
    );
  }
  if (!data) return null;

  const pendientes = documentosPorLlevar(data);
  const presencial = data.identidadPresencial;

  return (
    <Card title="Estado de tu inscripción" className="relative z-10 mt-5">
      <p className="text-sm text-text-secondary" role="status">
        {data.requisitosVerificados
          ? "Tus requisitos están verificados."
          : "Tus requisitos aún están en verificación."}{" "}
        {data.motivoBloqueo ? data.motivoBloqueo : null}
      </p>
      {data.cohorte ? (
        <p className="mt-2 text-sm">Cohorte: {data.cohorte.nombre}</p>
      ) : (
        <p className="mt-2 text-sm">Tu cohorte está pendiente. La escuela te asignará una.</p>
      )}
      {presencial ? (
        <p className="mt-2 text-sm">
          {presencial.confirmada
            ? "Tu cédula original fue verificada en persona."
            : "Tu instructor verificará tu cédula original en tu primera clase."}
        </p>
      ) : null}
      {pendientes.length > 0 ? (
        <>
          <p className="mt-3 text-sm text-text-secondary">Lleva estos documentos a la escuela:</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {pendientes.map((d) => (
              <li key={d.tipo}>{etiquetaDocumento(d.tipo)}</li>
            ))}
          </ul>
        </>
      ) : null}
      {data.diasRestantes !== null && data.fechaLimite ? (
        <p className="mt-3 text-sm" role="status">
          {textoPlazo(data.diasRestantes)} Fecha límite: {formatearFechaLimite(data.fechaLimite)}.
        </p>
      ) : null}
      <Link href="/student/documents" className={`${buttonClassName("secondary")} mt-4`}>
        Ver documentos para llevar
      </Link>
    </Card>
  );
}
