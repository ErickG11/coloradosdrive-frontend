"use client";
import { useRef, useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { StudentEnrollment } from "@/types/student";
export interface EnrollmentCohortManagement {
  version: string;
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
    open: boolean;
    enabled: boolean;
    current: boolean;
  }[];
}
export function StudentCohortTransfer({
  studentId,
  enrollment,
  onClose,
  onChanged,
}: {
  studentId: string;
  enrollment: StudentEnrollment;
  onClose: () => void;
  onChanged: () => void;
}) {
  const root = `/admin/estudiantes/${studentId}/matriculas/${enrollment.enrollmentId}`;
  const management = useFetch<EnrollmentCohortManagement>(`${root}/gestion`);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [exception, setException] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  const choices =
    management.data?.destinations.filter(
      (c) =>
        !c.current &&
        c.id !== enrollment.cohorte?.id &&
        c.open &&
        c.enabled &&
        c.occupied < c.capacity,
    ) ?? [];
  const selected = choices.find((c) => c.id === target);
  async function save() {
    if (
      submitting.current ||
      !selected ||
      !reason.trim() ||
      (!selected.fits && !exception) ||
      !management.data?.transferEnabled
    )
      return;
    submitting.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`${root}/cohorte`, {
        cohortId: selected.id,
        version: management.data.version,
        motivo: reason.trim(),
        excepcion: exception,
      });
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? `${error.code ?? "ERROR"}: ${error.message}`
          : error instanceof Error
            ? error.message
            : "No se pudo confirmar el cambio. Recarga antes de reintentar.",
      );
      management.refetch();
      setTarget("");
      setException(false);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      placement="right"
      title="Cambiar de cohorte"
      onClose={() => {
        if (!submitting.current) onClose();
      }}
    >
      <div className="grid gap-4 text-sm">
        <p>
          Tipo {enrollment.courseType} · Cohorte actual:{" "}
          {enrollment.cohorte?.nombre ?? "Sin cohorte"}
        </p>
        {management.isLoading ? (
          <p role="status">Consultando cohortes y capacidad del plan…</p>
        ) : null}
        {management.error ? <p role="alert">{management.error}</p> : null}
        {management.data && !management.data.transferEnabled ? (
          <p role="status">Esta matrícula no permite cambiar de cohorte en su estado actual.</p>
        ) : null}
        {management.data && management.data.transferEnabled && !choices.length ? (
          <p role="status">
            No hay cohortes del mismo tipo con matrícula abierta y cupo disponible.
          </p>
        ) : null}
        <Select
          label="Cohorte destino"
          value={target}
          disabled={busy || !management.data?.transferEnabled}
          onChange={(event) => {
            setTarget(event.target.value);
            setException(false);
            setMessage(null);
          }}
        >
          <option value="">Selecciona una cohorte</option>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.from} — {c.to} · {c.capacity - c.occupied} cupos libres
            </option>
          ))}
        </Select>
        {selected ? (
          <div aria-label="Comprobación del plan" className="rounded-sm border border-border p-3">
            <p>
              Ventana de curso: {selected.from} al {selected.to}.
            </p>
            <p>Cupos libres en el intervalo del alumno: {selected.capacity - selected.occupied}.</p>
            <p>{selected.reason}</p>
            {!selected.fits ? (
              <label className="mt-2 flex gap-2">
                <input
                  type="checkbox"
                  checked={exception}
                  disabled={busy}
                  onChange={(event) => setException(event.target.checked)}
                />
                Confirmo la excepción de fechas del plan con el motivo indicado.
              </label>
            ) : null}
          </div>
        ) : null}
        <Input
          label="Motivo del cambio de cohorte"
          value={reason}
          maxLength={500}
          required
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
        />
        <p>
          Se conservan los horarios, las prácticas realizadas, el precio, los pagos y el acceso.
        </p>
        {message ? <p role="alert">{message}</p> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              !selected ||
              !reason.trim() ||
              (!selected.fits && !exception) ||
              !management.data?.transferEnabled
            }
            isLoading={busy}
            onClick={() => void save()}
          >
            Confirmar cambio de cohorte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
