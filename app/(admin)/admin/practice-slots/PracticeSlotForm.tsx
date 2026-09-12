"use client";

import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  Cohort,
  CreatePracticeSlotInput,
  PracticeSlot,
  UpdatePracticeSlotInput,
  UserSummary,
} from "@/types";

interface PracticeSlotFormValues {
  cohortId: string;
  instructorId: string;
  /** Valor de <input type="datetime-local">, en hora local. */
  scheduledAt: string;
  durationMinutes: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildValues(slot: PracticeSlot | undefined, initialScheduledAt: string | undefined) {
  if (slot) {
    return {
      cohortId: slot.cohortId,
      instructorId: slot.instructorId,
      scheduledAt: toDatetimeLocalValue(slot.scheduledAt),
      durationMinutes: String(slot.durationMinutes),
    };
  }
  return {
    cohortId: "",
    instructorId: "",
    scheduledAt: initialScheduledAt ? toDatetimeLocalValue(initialScheduledAt) : "",
    durationMinutes: "",
  };
}

export interface PracticeSlotFormProps {
  cohorts: Cohort[];
  instructors: UserSummary[];
  /** Presente => modo edición (PATCH). Ausente => modo creación (POST). */
  slot?: PracticeSlot;
  /** Prefilled al crear desde un clic en una celda vacía del calendario. */
  initialScheduledAt?: string;
  onSaved: (slot: PracticeSlot) => void;
  onCancel: () => void;
}

// Vive dentro de un Modal (calendario admin), no en una ruta /new o
// /[id]/edit propia: termina avisando con onSaved/onCancel en vez de
// navegar con router.push, a diferencia de CohortForm/ExamForm.
export function PracticeSlotForm({
  cohorts,
  instructors,
  slot,
  initialScheduledAt,
  onSaved,
  onCancel,
}: PracticeSlotFormProps) {
  const isEditMode = Boolean(slot);
  const [values, setValues] = useState<PracticeSlotFormValues>(() =>
    buildValues(slot, initialScheduledAt),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof PracticeSlotFormValues>(
    field: K,
    value: PracticeSlotFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const scheduledAt = new Date(values.scheduledAt).toISOString();
      const saved = slot
        ? await api.patch<PracticeSlot>(`/practice-slots/${slot.id}`, {
            instructorId: values.instructorId,
            scheduledAt,
            durationMinutes: Number(values.durationMinutes),
          } satisfies UpdatePracticeSlotInput)
        : await api.post<PracticeSlot>("/practice-slots", {
            cohortId: values.cohortId,
            instructorId: values.instructorId,
            scheduledAt,
            durationMinutes: Number(values.durationMinutes),
          } satisfies CreatePracticeSlotInput);

      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la franja.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div>
        <Select
          label="Cohorte"
          name="cohortId"
          required
          disabled={isEditMode}
          value={values.cohortId}
          onChange={(event) => updateField("cohortId", event.target.value)}
        >
          <option value="" disabled>
            Selecciona una cohorte
          </option>
          {cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.nombre}
            </option>
          ))}
        </Select>
        {isEditMode ? (
          <p className="mt-1 text-sm text-text-secondary">
            La cohorte no se puede cambiar una vez creada la franja.
          </p>
        ) : null}
      </div>

      <Select
        label="Instructor"
        name="instructorId"
        required
        value={values.instructorId}
        onChange={(event) => updateField("instructorId", event.target.value)}
      >
        <option value="" disabled>
          Selecciona un instructor
        </option>
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.nombreCompleto}
          </option>
        ))}
      </Select>

      <Input
        label="Fecha y hora"
        name="scheduledAt"
        type="datetime-local"
        required
        value={values.scheduledAt}
        onChange={(event) => updateField("scheduledAt", event.target.value)}
      />

      <Input
        label="Duración (minutos)"
        name="durationMinutes"
        type="number"
        min="1"
        step="1"
        required
        value={values.durationMinutes}
        onChange={(event) => updateField("durationMinutes", event.target.value)}
      />

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEditMode ? "Guardar cambios" : "Crear franja"}
        </Button>
      </div>
    </form>
  );
}
