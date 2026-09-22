"use client";

import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort, Enrollment, User } from "@/types";

interface EnrollmentFormValues {
  cedula: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  cohortId: string;
}

const EMPTY_VALUES: EnrollmentFormValues = {
  cedula: "",
  nombreCompleto: "",
  correo: "",
  telefono: "",
  cohortId: "",
};

interface EnrollStudentResponse {
  student: User;
  enrollment: Enrollment;
}

interface EnrollmentFormProps {
  cohorts: Cohort[];
}

export function EnrollmentForm({ cohorts }: EnrollmentFormProps) {
  const [values, setValues] = useState<EnrollmentFormValues>(EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof EnrollmentFormValues>(
    field: K,
    value: EnrollmentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await api.post<EnrollStudentResponse>("/enrollments", {
        cedula: values.cedula,
        nombreCompleto: values.nombreCompleto,
        correo: values.correo,
        telefono: values.telefono || undefined,
        cohortId: values.cohortId,
      });
      setSuccessMessage(
        `${result.student.nombreCompleto} fue matriculado correctamente. Recibirá sus credenciales de acceso en ${values.correo}.`,
      );
      setValues(EMPTY_VALUES);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la matrícula.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Input
        label="Cédula"
        name="cedula"
        required
        pattern="[0-9]{10}"
        title="10 dígitos numéricos"
        value={values.cedula}
        onChange={(event) => updateField("cedula", event.target.value)}
      />
      <Input
        label="Nombres completos"
        name="nombreCompleto"
        required
        value={values.nombreCompleto}
        onChange={(event) => updateField("nombreCompleto", event.target.value)}
      />
      <Input
        label="Correo electrónico"
        name="correo"
        type="email"
        required
        value={values.correo}
        onChange={(event) => updateField("correo", event.target.value)}
      />
      <Input
        label="Teléfono"
        name="telefono"
        value={values.telefono}
        onChange={(event) => updateField("telefono", event.target.value)}
      />
      <Select
        label="Cohorte"
        name="cohortId"
        required
        value={values.cohortId}
        onChange={(event) => updateField("cohortId", event.target.value)}
      >
        <option value="" disabled>
          Selecciona una cohorte
        </option>
        {cohorts.map((cohort) => (
          <option key={cohort.id} value={cohort.id}>
            {cohort.nombre} — ${cohort.precio.toFixed(2)}
          </option>
        ))}
      </Select>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {successMessage ? (
        // El "éxito" no tiene color propio en la paleta cerrada de 4
        // colores: se comunica con ícono + texto en accent-blue, no con
        // un verde nuevo.
        <p className="flex items-start gap-2 text-sm text-accent-blue">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </p>
      ) : null}

      <Button type="submit" isLoading={isSubmitting}>
        Matricular estudiante
      </Button>
    </form>
  );
}
