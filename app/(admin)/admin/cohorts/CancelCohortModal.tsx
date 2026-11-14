"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort } from "@/types";
export function CancelCohortModal({
  cohort,
  onClose,
  onCancelled,
  onReload,
}: {
  cohort: Cohort;
  onClose: () => void;
  onCancelled: (message: string) => void;
  onReload: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    code?: string;
    cantidad?: number;
  } | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !reason.trim()) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await api.post(`/cohorts/${cohort.id}/cancelar`, {
        updatedAt: cohort.updatedAt,
        motivo: reason.trim(),
      });
      onCancelled(`Cohorte «${cohort.nombre}» cancelada.`);
    } catch (error) {
      setFailure({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar la cancelación. Recarga antes de reintentar.",
        ...(error instanceof ApiError
          ? { code: error.code, cantidad: error.detalles?.cantidad }
          : {}),
      });
      if (error instanceof ApiError && error.status === 404) onReload();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      title={`Cancelar cohorte «${cohort.nombre}»`}
      onClose={() => {
        if (!submitting.current) onClose();
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <p>
          La cohorte dejará de admitir inscripciones. Las matrículas y reservas vinculadas se
          comprueban al confirmar.
        </p>
        <Input
          label="Motivo de cancelación"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          required
          disabled={busy}
        />
        {failure ? (
          <div role="alert" className="grid gap-2 text-accent-red">
            <p>
              {failure.code ? `${failure.code}: ` : ""}
              {failure.message}
            </p>
            {failure.cantidad !== undefined ? <p>Alumnos afectados: {failure.cantidad}.</p> : null}
            {failure.code === "COHORTE_CANCELACION_BLOQUEADA" ? (
              <Link
                className="underline"
                href={`/admin/students?cohortId=${encodeURIComponent(cohort.id)}`}
              >
                Ver alumnos de esta cohorte
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Conservar cohorte
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!reason.trim() || failure?.code === "COHORTE_CANCELACION_BLOQUEADA"}
            isLoading={busy}
          >
            Cancelar cohorte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
