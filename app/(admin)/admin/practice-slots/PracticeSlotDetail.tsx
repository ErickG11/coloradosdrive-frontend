"use client";

import { useState } from "react";

import { Button, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlot } from "@/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface PracticeSlotDetailProps {
  slot: PracticeSlot;
  instructorName: string;
  studentName: string | null;
  onEdit: () => void;
  onDeleted: () => void;
}

// El backend solo permite editar/eliminar mientras status = 'disponible'
// (sin estudiante asignado): los botones se deshabilitan explícitamente
// en el resto de los estados, con el texto que explica por qué, en vez de
// dejar que el usuario descubra la restricción con un 409.
export function PracticeSlotDetail({
  slot,
  instructorName,
  studentName,
  onEdit,
  onDeleted,
}: PracticeSlotDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const canModify = slot.status === "disponible";

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await api.delete(`/practice-slots/${slot.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la franja.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusBadge status={slot.status} />

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Fecha y hora</dt>
          <dd className="text-text-primary">{formatDateTime(slot.scheduledAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Duración</dt>
          <dd className="text-text-primary">{slot.durationMinutes} min</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Instructor</dt>
          <dd className="text-text-primary">{instructorName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Estudiante</dt>
          <dd className="text-text-primary">{studentName ?? "—"}</dd>
        </div>
      </dl>

      {!canModify ? (
        <p className="text-sm text-text-secondary">
          Solo se puede editar o eliminar una franja mientras está disponible (sin estudiante
          asignado).
        </p>
      ) : null}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="danger"
          disabled={!canModify || isDeleting}
          isLoading={isDeleting}
          onClick={() => void handleDelete()}
        >
          Eliminar
        </Button>
        <Button type="button" variant="secondary" disabled={!canModify} onClick={onEdit}>
          Editar
        </Button>
      </div>
    </div>
  );
}
