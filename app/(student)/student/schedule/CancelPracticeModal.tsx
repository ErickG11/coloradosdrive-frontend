"use client";

import { useState } from "react";

import { Button, FormError, Modal, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  CancellationCategory,
  CancellationOutcome,
  CancellationPreview,
  CancelPracticeSlotInput,
  CancelPracticeSlotResult,
} from "@/types/practiceSlot";

const CATEGORY_LABELS: Record<CancellationCategory, string> = {
  salud: "Salud",
  trabajo: "Trabajo",
  estudios: "Estudios",
  familiar: "Motivos familiares",
  transporte: "Transporte",
  otro: "Otro motivo",
};

export function cancellationConsequence(outcome: CancellationOutcome): string {
  switch (outcome) {
    case "reprogramable":
      return "Podrás elegir otra hora disponible.";
    case "hora_perdida":
      return "No hay horarios libres antes del cierre de tus prácticas: si cancelas, esta hora se pierde.";
    case "falta":
      return "Ya usaste tus 2 reprogramaciones: si cancelas, quedará registrada como falta.";
  }
}

interface CancelPracticeModalProps {
  slotId: string;
  preview: CancellationPreview;
  onClose: () => void;
  onCancelled: (result: CancelPracticeSlotResult) => void;
}

export function CancelPracticeModal({ slotId, preview, onClose, onCancelled }: CancelPracticeModalProps) {
  const [category, setCategory] = useState<CancellationCategory | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedReason = reason.trim();
  const isValid = category !== "" && trimmedReason.length >= 10;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const payload: CancelPracticeSlotInput = { motivoCategoria: category, motivoTexto: trimmedReason };
      const result = await api.post<CancelPracticeSlotResult>(`/practice-slots/${slotId}/cancel`, payload);
      onCancelled(result);
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409)
        ? err.message
        : "No se pudo cancelar la práctica. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!isSubmitting) onClose(); }} title="Cancelar práctica">
      <form onSubmit={(event) => { void submit(event); }} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Te quedan {preview.reprogramacionesRestantes} de 2 reprogramaciones.
        </p>
        <p className="rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text-primary">
          {cancellationConsequence(preview.resultadoSiCancela)}
        </p>
        <Select
          id="cancel-category"
          label="Motivo de cancelación"
          value={category}
          onChange={(event) => { setCategory(event.target.value as CancellationCategory | ""); setError(null); }}
          autoFocus
          required
        >
          <option value="">Selecciona un motivo</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <div>
          <Textarea
            id="cancel-reason"
            label="Explica el motivo"
            value={reason}
            onChange={(event) => { setReason(event.target.value); setError(null); }}
            aria-describedby="cancel-reason-count"
            minLength={10}
            required
          />
          <p id="cancel-reason-count" className="mt-1 text-xs text-text-secondary">
            {trimmedReason.length} caracteres · mínimo 10
          </p>
        </div>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Volver
          </Button>
          <Button type="submit" variant="danger" disabled={!isValid} isLoading={isSubmitting}>
            Confirmar cancelación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
