"use client";
import { useRef, useState } from "react";
import {
  DOCUMENTS,
  type DocumentStatus,
  type DocumentType,
} from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { StudentEnrollment } from "@/types/student";
const STATES: { value: DocumentStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "entregado", label: "Entregado" },
  { value: "no_aplica", label: "No aplica" },
];
type RowState = { busy?: boolean; saved?: boolean; error?: string; status?: DocumentStatus };
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
  const management = useFetch<{ documentsEnabled: boolean }>(`${root}/gestion`);
  const [rows, setRows] = useState<Partial<Record<DocumentType, RowState>>>({});
  const pending = useRef(new Set<DocumentType>());
  async function write(doc: StudentEnrollment["documentos"][number], estado: DocumentStatus) {
    const previous = rows[doc.tipo]?.status ?? doc.estado;
    if (pending.current.has(doc.tipo) || estado === previous) return;
    pending.current.add(doc.tipo);
    setRows((current) => ({
      ...current,
      [doc.tipo]: { ...current[doc.tipo], busy: true, error: undefined, saved: false },
    }));
    try {
      await api.post(`${root}/documento`, { tipo: doc.tipo, estado, anterior: previous });
      setRows((current) => ({ ...current, [doc.tipo]: { status: estado, saved: true } }));
      onChanged?.();
    } catch (error) {
      setRows((current) => ({
        ...current,
        [doc.tipo]: {
          ...current[doc.tipo],
          busy: false,
          saved: false,
          status: undefined,
          error:
            error instanceof ApiError
              ? `${error.code ? `${error.code}: ` : ""}${error.message}`
              : error instanceof Error
                ? error.message
                : "No se pudo confirmar el cambio. Recarga la ficha.",
        },
      }));
      management.refetch();
      if (error instanceof ApiError && error.code === "DOCUMENTO_VERSION_CONFLICTO") onChanged?.();
    } finally {
      pending.current.delete(doc.tipo);
    }
  }
  return (
    <div>
      {management.error ? (
        <p role="alert" className="mb-3 text-sm text-status-error">
          {management.error}
        </p>
      ) : null}
      {enrollment.documentos.length === 0 ? (
        <p className="text-sm text-text-secondary">No hay documentos registrados.</p>
      ) : (
        <ul className="divide-y divide-border">
          {enrollment.documentos.map((doc) => {
            const row = rows[doc.tipo];
            const label =
              DOCUMENTS.find((item) => item.tipo === doc.tipo)?.label ?? "Documento adicional";
            return (
              <li key={doc.tipo} className="grid gap-3 py-4 text-sm" aria-busy={row?.busy ?? false}>
                <p className="font-medium">{label}</p>
                <div
                  role="group"
                  aria-label={`Estado de ${label}`}
                  className="grid grid-cols-3 rounded-sm border border-border p-1"
                >
                  {STATES.map((state) => (
                    <button
                      key={state.value}
                      type="button"
                      aria-pressed={(row?.status ?? doc.estado) === state.value}
                      disabled={row?.busy || !management.data?.documentsEnabled}
                      className="min-h-11 rounded-sm px-1 text-xs text-text-secondary aria-pressed:bg-brand-primary aria-pressed:font-semibold aria-pressed:text-white disabled:cursor-default disabled:opacity-60"
                      onClick={() => void write(doc, state.value)}
                    >
                      {state.label}
                    </button>
                  ))}
                </div>
                {row?.busy ? (
                  <p role="status" className="text-text-secondary">
                    Guardando…
                  </p>
                ) : row?.error ? (
                  <p role="alert" className="text-status-error">
                    {row.error}
                  </p>
                ) : row?.saved ? (
                  <p role="status" className="text-status-success">
                    Cambio guardado.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
