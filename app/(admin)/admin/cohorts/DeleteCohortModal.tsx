"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button, FormError, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort } from "@/types";

interface DeleteCohortResponse {
  id: string;
  nombre: string;
  message: string;
}

// Misma comparación que el servidor (contrato L6b): Unicode NFC y sin
// espacios extremos; distingue mayúsculas y espacios internos.
export function normalizeCohortName(value: string): string {
  return value.normalize("NFC").trim();
}

interface DeleteCohortModalProps {
  cohort: Cohort;
  courseLabel: string;
  onClose: () => void;
  /** La cohorte se eliminó: el listado muestra el mensaje y se recarga. */
  onDeleted: (message: string) => void;
  /** La cohorte ya no existe (404): el listado se recarga. */
  onGone: () => void;
}

export function DeleteCohortModal({
  cohort,
  courseLabel,
  onClose,
  onDeleted,
  onGone,
}: DeleteCohortModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 409 (alumnos, franjas o recuperaciones) o 404: reintentar no sirve.
  const [blocked, setBlocked] = useState(false);
  const submitting = useRef(false);

  const matches = normalizeCohortName(confirmation) === normalizeCohortName(cohort.nombre);

  function close() {
    if (!submitting.current) onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches || blocked || submitting.current) return;
    submitting.current = true;
    setIsDeleting(true);
    setFieldError(null);
    setError(null);
    try {
      const result = await api.delete<DeleteCohortResponse>(
        `/cohorts/${encodeURIComponent(cohort.id)}`,
        { body: { confirmacionNombre: confirmation } },
      );
      submitting.current = false;
      onDeleted(`Cohorte «${result.nombre}» eliminada.`);
      return;
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFIRMATION_MISMATCH") {
        // Puede que otra persona haya renombrado la cohorte: se recarga el
        // listado y hay que reabrir el diálogo para ver el nombre vigente.
        setFieldError(
          `${err.message} Si la cohorte cambió de nombre, cierra este diálogo y vuelve a abrirlo.`,
        );
        onGone();
      } else if (err instanceof ApiError && err.field === "confirmacionNombre") {
        setFieldError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "No se pudo eliminar la cohorte.");
        if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
          setBlocked(true);
        }
        if (err instanceof ApiError && err.status === 404) onGone();
      }
    }
    submitting.current = false;
    setIsDeleting(false);
  }

  return (
    <Modal isOpen onClose={close} title={`Eliminar la cohorte «${cohort.nombre}»`}>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-secondary">Cohorte</dt>
          <dd className="text-text-primary">{cohort.nombre}</dd>
          <dt className="text-text-secondary">Curso</dt>
          <dd className="text-text-primary">{courseLabel}</dd>
        </dl>
        <p className="text-sm text-text-primary">
          Esta acción no se puede deshacer. Solo se puede eliminar una cohorte sin alumnos, franjas
          de práctica ni recuperaciones asociadas.
        </p>
        <Input
          id="cohort-delete-confirmation"
          label="Para confirmar, escribe el nombre exacto de la cohorte:"
          autoComplete="off"
          autoFocus
          value={confirmation}
          disabled={isDeleting || blocked}
          error={fieldError ?? undefined}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setFieldError(null);
          }}
        />
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={isDeleting} onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isDeleting}
            disabled={!matches || blocked}
          >
            Eliminar cohorte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
