"use client";

import { useState } from "react";

import { Button, FormError, Modal, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PendingPracticeSlot, ReleasedPracticeSlot, SwapPracticeResult } from "@/types/practiceSlot";

import { formatPracticeDateTime } from "./formatPracticeDateTime";

interface SwapPracticeModalProps {
  slot: ReleasedPracticeSlot;
  pending: PendingPracticeSlot[];
  onClose: () => void;
  onSwapped: (result: SwapPracticeResult) => void;
  onConflict: () => void;
}

function swapError(err: unknown): string {
  if (!(err instanceof ApiError)) return "No se pudo cambiar el horario. Inténtalo de nuevo.";
  if (err.status === 400) return "Revisa la práctica elegida e inténtalo de nuevo.";
  if (err.status === 404 || err.message.includes("Otro alumno tomó") || err.message.includes("ya no está disponible")) {
    return "Otro alumno tomó este horario o ya no está disponible. Revisa los cupos actualizados.";
  }
  if (err.message.includes("Ya usaste tus 2 reprogramaciones")) {
    return "Ya usaste tus 2 reprogramaciones y no puedes cambiar otra práctica.";
  }
  if (err.message.includes("práctica a soltar") || err.message.includes("práctica que ibas a soltar")) {
    return "La práctica que elegiste para soltar ya no es válida. Revisa tus horarios.";
  }
  if (err.status === 403 || err.message.includes("no es elegible") || err.message.includes("no tienes matrícula activa")) {
    return "Este horario ya no está disponible para ti. Revisa los cupos actualizados.";
  }
  if (err.status === 409) return err.message || "El horario cambió. Revisa los cupos actualizados.";
  return "No se pudo cambiar el horario. Inténtalo de nuevo.";
}

export function SwapPracticeModal({ slot, pending, onClose, onSwapped, onConflict }: SwapPracticeModalProps) {
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const candidates = pending.filter((item) => item.enrollmentId === slot.enrollmentId
    && slot.practicasASoltarIds.includes(item.slot.id));
  const selected = candidates.find((item) => item.slot.id === sourceId);
  const isChange = slot.caso === "B";
  const canSubmit = !isSubmitting && (!isChange || (slot.reprogramacionesRestantes > 0 && selected !== undefined));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const body = isChange ? { practicaASoltarId: sourceId } : undefined;
      const result = await api.post<SwapPracticeResult>(`/practice-slots/${slot.id}/swap`, body);
      onSwapped(result);
    } catch (err) {
      setError(swapError(err));
      if (err instanceof ApiError && (err.status === 409 || err.status === 404 || err.status === 403)) onConflict();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!isSubmitting) onClose(); }} title="Cambiar horario">
      <form onSubmit={(event) => { void submit(event); }} className="flex flex-col gap-4">
        <p className="text-sm text-text-primary">Nuevo horario: {formatPracticeDateTime(slot.scheduledAt)}.</p>
        {isChange ? (
          <>
            <Select
              id="practice-to-release"
              label="Práctica que soltarás"
              value={sourceId}
              onChange={(event) => { setSourceId(event.target.value); setError(null); }}
              autoFocus
            >
              <option value="">Elige una práctica</option>
              {candidates.map((item) => (
                <option key={item.slot.id} value={item.slot.id}>
                  {formatPracticeDateTime(item.slot.scheduledAt)}
                </option>
              ))}
            </Select>
            {selected ? (
              <p className="rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text-primary">
                Soltar tu práctica del {formatPracticeDateTime(selected.slot.scheduledAt)} usará 1 de tus reprogramaciones. Te quedarían {slot.reprogramacionesRestantes - 1} de 2.
              </p>
            ) : null}
            {slot.reprogramacionesRestantes === 0 ? (
              <p className="text-sm text-text-secondary">Ya usaste tus 2 reprogramaciones y no puedes cambiar otra práctica.</p>
            ) : null}
            {candidates.length === 0 ? (
              <p className="text-sm text-text-secondary">No hay una práctica pendiente válida para soltar. Actualiza tus horarios.</p>
            ) : null}
          </>
        ) : (
          <p className="rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text-primary">
            Vas a reponer tu hora pendiente con este horario. No usarás otra reprogramación.
          </p>
        )}
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Volver</Button>
          <Button type="submit" autoFocus={!isChange} disabled={!canSubmit} isLoading={isSubmitting}>
            Confirmar cambio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
