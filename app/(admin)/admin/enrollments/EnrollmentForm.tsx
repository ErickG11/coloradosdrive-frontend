"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";
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

      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="font-sans text-sm text-accent-red"
          >
            {error}
          </motion.p>
        ) : null}
        {successMessage ? (
          // Sin color dedicado a "éxito": la paleta queda cerrada a
          // rojo/blanco/negro/azul marino. Se comunica con un ícono de
          // check + el texto del mensaje, sobre el azul de acento.
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-2 rounded-sm border border-accent-blue/30 bg-accent-blue-subtle px-3 py-2"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue"
            >
              <path
                d="M4 10.5L8 14.5L16 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="font-sans text-sm text-accent-blue">{successMessage}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button type="submit" isLoading={isSubmitting}>
        Matricular estudiante
      </Button>
    </form>
  );
}
