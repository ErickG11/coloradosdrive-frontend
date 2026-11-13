"use client";
import { useState } from "react";
import { Select } from "@/components/ui";
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
    [busy, setBusy] = useState(false);
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
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
