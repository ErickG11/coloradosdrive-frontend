"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course } from "@/types";

export interface CohortFormValues {
  courseId: string;
  nombre: string;
  precio: string;
  cupoMaximo: string;
  fechaInicio: string;
  fechaFin: string;
}

const EMPTY_VALUES: CohortFormValues = {
  courseId: "",
  nombre: "",
  precio: "",
  cupoMaximo: "",
  fechaInicio: "",
  fechaFin: "",
};

interface CohortFormProps {
  courses: Course[];
  /** Presente => modo edición (PATCH). Ausente => modo creación (POST). */
  cohortId?: string;
  initialValues?: CohortFormValues;
}

export function CohortForm({ courses, cohortId, initialValues }: CohortFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(cohortId);
  const [values, setValues] = useState<CohortFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CohortFormValues>(field: K, value: CohortFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body = {
      courseId: values.courseId,
      nombre: values.nombre,
      precio: Number(values.precio),
      cupoMaximo: Number(values.cupoMaximo),
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin,
    };

    try {
      if (cohortId) {
        await api.patch(`/cohorts/${cohortId}`, body);
      } else {
        await api.post("/cohorts", body);
      }
      router.push("/admin/cohorts");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la cohorte.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Select
        label="Curso"
        name="courseId"
        required
        value={values.courseId}
        onChange={(event) => updateField("courseId", event.target.value)}
      >
        <option value="" disabled>
          Selecciona un curso
        </option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.nombre} (Tipo {course.tipo})
          </option>
        ))}
      </Select>

      <Input
        label="Nombre de la cohorte"
        name="nombre"
        required
        value={values.nombre}
        onChange={(event) => updateField("nombre", event.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Precio"
          name="precio"
          type="number"
          min="0"
          step="0.01"
          required
          value={values.precio}
          onChange={(event) => updateField("precio", event.target.value)}
        />
        <Input
          label="Cupo máximo"
          name="cupoMaximo"
          type="number"
          min="1"
          step="1"
          required
          value={values.cupoMaximo}
          onChange={(event) => updateField("cupoMaximo", event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Fecha de inicio"
          name="fechaInicio"
          type="date"
          required
          value={values.fechaInicio}
          onChange={(event) => updateField("fechaInicio", event.target.value)}
        />
        <Input
          label="Fecha de fin"
          name="fechaFin"
          type="date"
          required
          value={values.fechaFin}
          onChange={(event) => updateField("fechaFin", event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <Button type="submit" isLoading={isSubmitting}>
        {isEditMode ? "Guardar cambios" : "Crear cohorte"}
      </Button>
    </form>
  );
}
