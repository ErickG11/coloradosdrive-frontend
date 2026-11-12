"use client";
import { useState } from "react";
import { Button, Select, Input } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { StudentEnrollment } from "@/types/student";
interface Management {
  version: string;
  documentsEnabled: boolean;
  transferEnabled: boolean;
  destinations: {
    id: string;
    name: string;
    from: string;
    to: string;
    capacity: number;
    occupied: number;
    fits: boolean;
    reason: string;
  }[];
}
export function EnrollmentAdminControls({
  studentId,
  enrollment,
  onChanged,
}: {
  studentId: string;
  enrollment: StudentEnrollment;
  onChanged?: () => void;
}) {
  const root = `/admin/estudiantes/${studentId}/matriculas/${enrollment.enrollmentId}`;
  const management = useFetch<Management>(`${root}/gestion`);
  const [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false),
    [target, setTarget] = useState(""),
    [reason, setReason] = useState(""),
    [exception, setException] = useState(false);
  async function write(path: string, body: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`${root}/${path}`, body);
      setMessage("Cambio guardado.");
      management.refetch();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el cambio. Recarga la ficha.",
      );
    } finally {
      setBusy(false);
    }
  }
  const data = management.data;
  if (!data) return management.error ? <p role="alert">{management.error}</p> : null;
  return (
    <div className="mt-3 grid gap-3">
      {data.documentsEnabled ? (
        <fieldset disabled={busy}>
          <legend>Actualizar documentos físicos</legend>
          {enrollment.documentos.map((doc) => (
            <label className="block" key={doc.tipo}>
              {doc.tipo}
              <Select
                aria-label={`Estado de ${doc.tipo}`}
                value={doc.estado}
                onChange={(event) =>
                  void write("documento", {
                    tipo: doc.tipo,
                    estado: event.target.value,
                    anterior: doc.estado,
                  })
                }
              >
                <option value="pendiente">Pendiente</option>
                <option value="entregado">Entregado</option>
                <option value="no_aplica">No aplica</option>
              </Select>
              {doc.fechaMarcado ? (
                <small>
                  Última decisión: {doc.fechaMarcado}
                  {doc.marcadoPor ? ` · administrador ${doc.marcadoPor}` : ""}
                </small>
              ) : null}
            </label>
          ))}
        </fieldset>
      ) : null}
      {data.transferEnabled && data.destinations.length ? (
        <>
          <Button type="button" variant="secondary" onClick={() => setExpanded(!expanded)}>
            Asignar / cambiar cohorte
          </Button>
          {expanded ? (
            <fieldset disabled={busy}>
              <legend>Destino del mismo tipo</legend>
              <Select
                label="Cohorte destino"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="">Selecciona un destino</option>
                {data.destinations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.from} — {c.to} · {c.occupied}/{c.capacity}
                  </option>
                ))}
              </Select>
              {target ? <p>{data.destinations.find((c) => c.id === target)?.reason}</p> : null}
              <Input
                label="Motivo obligatorio"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={exception}
                  onChange={(event) => setException(event.target.checked)}
                />
                Confirmo la excepción de fechas o matrícula cerrada con el motivo indicado.
              </label>
              <p>Se conservan horarios, prácticas realizadas, precio, pagos y acceso.</p>
              <Button
                type="button"
                disabled={!target || !reason.trim()}
                isLoading={busy}
                onClick={() =>
                  void write("cohorte", {
                    cohortId: target,
                    version: data.version,
                    motivo: reason.trim(),
                    excepcion: exception,
                  })
                }
              >
                Confirmar asignación / cambio
              </Button>
            </fieldset>
          ) : null}
        </>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
