"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui";
import { confirmarIdentidadPresencial } from "@/lib/api/inscripcion";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlotWithNames } from "@/types";

// Campos que el endpoint de agenda añade solo para el primer día de un alumno que viene de
// solicitud de inscripción. Son opcionales: sin ellos el control no aparece.
type SlotConIdentidad = PracticeSlotWithNames & {
  identidadPresencialPendiente?: boolean;
  certificadoOriginalRequerido?: boolean;
};

function mensajeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 403 || cause.status === 409) {
      return "No se puede confirmar ahora: debe ser tu franja, dentro de la ventana de asistencia y sin confirmación previa. Actualiza la agenda.";
    }
    if (cause.status === 404) return "Franja no encontrada. Actualiza la agenda.";
  }
  return "No se pudo guardar la confirmación. Intenta de nuevo.";
}

export function IdentidadPresencialControl({ slot }: { slot: PracticeSlotWithNames }) {
  const { identidadPresencialPendiente, certificadoOriginalRequerido } = slot as SlotConIdentidad;
  const [cedula, setCedula] = useState(false);
  const [certificado, setCertificado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const aplica =
    slot.studentId !== null && slot.status !== "disponible" && slot.status !== "liberado";
  if (!aplica) return null;
  if (done) {
    return (
      <p role="status" className="text-sm text-text-secondary">
        Cédula original confirmada.
      </p>
    );
  }
  if (identidadPresencialPendiente !== true) return null;

  async function save() {
    if (busy.current || !cedula) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await confirmarIdentidadPresencial(slot.id, {
        cedulaOriginalVista: true,
        ...(certificadoOriginalRequerido ? { certificadoOriginalVisto: certificado } : {}),
      });
      setDone(true);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const inputId = `cedula-original-${slot.id}`;
  const certId = `certificado-original-${slot.id}`;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-secondary">
        Primer día del alumno: compara su cédula original con la solicitud.
      </p>
      <label
        htmlFor={inputId}
        className="flex min-h-11 items-center gap-3 text-sm text-text-primary"
      >
        <input
          id={inputId}
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-accent-red"
          checked={cedula}
          disabled={saving}
          onChange={(event) => setCedula(event.target.checked)}
        />
        Confirmé la cédula original
      </label>
      {certificadoOriginalRequerido ? (
        <label
          htmlFor={certId}
          className="flex min-h-11 items-center gap-3 text-sm text-text-primary"
        >
          <input
            id={certId}
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-accent-red"
            checked={certificado}
            disabled={saving}
            onChange={(event) => setCertificado(event.target.checked)}
          />
          Confirmé el certificado de estudios original
        </label>
      ) : null}
      <Button
        size="sm"
        className="min-h-11 self-start"
        disabled={!cedula || saving}
        onClick={() => void save()}
      >
        Guardar confirmación
      </Button>
      {saving ? (
        <p role="status" className="text-sm text-text-secondary">
          Guardando…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
