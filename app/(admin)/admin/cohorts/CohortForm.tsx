"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button, FormError, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course } from "@/types";

import { COHORT_LIMITS, maxCohortDate } from "./cohortLimits";

export interface CohortFormValues {
  courseId: string;
  nombre: string;
  precio: string;
  cupoMaximo: string;
  fechaInicioMatricula: string;
  fechaFinMatricula: string;
  fechaInicioCurso: string;
  fechaFinCurso: string;
  tipoModalidad: string;
  horariosCapacitacionTeoria: string;
  numeroVehiculos: string;
  numeroAulas: string;
}

const EMPTY_VALUES: CohortFormValues = {
  courseId: "",
  nombre: "",
  precio: "",
  cupoMaximo: "",
  fechaInicioMatricula: "",
  fechaFinMatricula: "",
  fechaInicioCurso: "",
  fechaFinCurso: "",
  tipoModalidad: "",
  horariosCapacitacionTeoria: "",
  numeroVehiculos: "",
  numeroAulas: "",
};

type FieldErrors = Partial<Record<keyof CohortFormValues, string>>;

// Al editar un campo se descartan también los errores que dependen de él:
// las fechas de fin que se comparan con una fecha de inicio (incluida la
// regla «el curso no puede terminar antes de que abra la matrícula») y, al
// cambiar de curso, el nombre duplicado (la unicidad es por curso).
const RELATED_ERRORS: Partial<Record<keyof CohortFormValues, (keyof CohortFormValues)[]>> = {
  fechaInicioMatricula: ["fechaFinMatricula", "fechaFinCurso"],
  fechaInicioCurso: ["fechaFinCurso"],
  courseId: ["nombre"],
};

// El servidor indica en `field` el campo del cuerpo (mismo nombre que el input).
function isFormField(field: string | undefined): field is keyof CohortFormValues {
  return field !== undefined && Object.prototype.hasOwnProperty.call(EMPTY_VALUES, field);
}

interface CohortFormProps {
  courses: Course[];
  /** Presente => modo edición (PATCH). Ausente => modo creación (POST). */
  cohortId?: string;
  initialValues?: CohortFormValues;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Un campo numérico vacío se envía como null: Number("") daría 0, que el
// servidor aceptaría como valor legítimo (precio vacío = $0.00).
function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function CohortForm({ courses, cohortId, initialValues }: CohortFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditMode = Boolean(cohortId);
  const [values, setValues] = useState<CohortFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // El servidor rechaza fechas posteriores a hoy + 5 años.
  const [maxDate] = useState(() => maxCohortDate());

  function updateField<K extends keyof CohortFormValues>(field: K, value: CohortFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    const cleared = [field, ...(RELATED_ERRORS[field] ?? [])];
    setFieldErrors((current) => {
      if (!cleared.some((name) => current[name])) return current;
      const next = { ...current };
      for (const name of cleared) delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Cada regla de fechas se muestra junto al campo que hay que corregir.
    // Solo se compara si ambas fechas existen: una fecha vacía la rechaza
    // el navegador (o el servidor, con su propio mensaje).
    const bothDates = (start: string, end: string) => start !== "" && end !== "";
    const dateErrors: FieldErrors = {};
    if (
      bothDates(values.fechaInicioMatricula, values.fechaFinMatricula) &&
      values.fechaFinMatricula < values.fechaInicioMatricula
    ) {
      dateErrors.fechaFinMatricula =
        "El fin de matrícula no puede ser anterior al inicio de matrícula.";
    }
    if (
      bothDates(values.fechaInicioCurso, values.fechaFinCurso) &&
      values.fechaFinCurso < values.fechaInicioCurso
    ) {
      dateErrors.fechaFinCurso = "El fin de curso no puede ser anterior al inicio de curso.";
    } else if (
      bothDates(values.fechaInicioMatricula, values.fechaFinCurso) &&
      values.fechaFinCurso < values.fechaInicioMatricula
    ) {
      // Misma regla y frase que el servidor (contrato L3b).
      dateErrors.fechaFinCurso = "El curso no puede terminar antes de que abra la matrícula.";
    }
    setFieldErrors(dateErrors);
    if (Object.keys(dateErrors).length > 0) return;

    setIsSubmitting(true);

    const body = {
      courseId: values.courseId,
      nombre: values.nombre,
      precio: optionalNumber(values.precio),
      cupoMaximo: optionalNumber(values.cupoMaximo),
      fechaInicioMatricula: values.fechaInicioMatricula,
      fechaFinMatricula: values.fechaFinMatricula,
      fechaInicioCurso: values.fechaInicioCurso,
      fechaFinCurso: values.fechaFinCurso,
      tipoModalidad: optionalText(values.tipoModalidad),
      horariosCapacitacionTeoria: optionalText(values.horariosCapacitacionTeoria),
      numeroVehiculos: optionalNumber(values.numeroVehiculos),
      numeroAulas: optionalNumber(values.numeroAulas),
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
      if (err instanceof ApiError && isFormField(err.field)) {
        // Error de un campo concreto (400 de validación, 404 de curso,
        // 409 de nombre duplicado): se muestra junto a ese campo.
        const field = err.field;
        setFieldErrors({ [field]: err.message });
        formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      } else {
        setError(err instanceof ApiError ? err.message : "No se pudo guardar la cohorte.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <Select
        label="Curso"
        name="courseId"
        error={fieldErrors.courseId}
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
        error={fieldErrors.nombre}
        required
        maxLength={COHORT_LIMITS.nombreMaxLength}
        value={values.nombre}
        onChange={(event) => updateField("nombre", event.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Precio"
          name="precio"
          error={fieldErrors.precio}
          type="number"
          min={COHORT_LIMITS.precioMin}
          max={COHORT_LIMITS.precioMax}
          step={COHORT_LIMITS.precioStep}
          required
          value={values.precio}
          onChange={(event) => updateField("precio", event.target.value)}
        />
        <Input
          label="Cupo máximo"
          name="cupoMaximo"
          error={fieldErrors.cupoMaximo}
          type="number"
          min={COHORT_LIMITS.cupoMin}
          max={COHORT_LIMITS.cupoMax}
          step="1"
          required
          value={values.cupoMaximo}
          onChange={(event) => updateField("cupoMaximo", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">Ventana de matrícula</p>
        <p className="text-xs text-text-secondary">
          El fin de matrícula es el plazo real que se comunica al estudiante para entregar
          documentos físicos completos.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Inicio de matrícula"
            name="fechaInicioMatricula"
            error={fieldErrors.fechaInicioMatricula}
            type="date"
            required
            max={maxDate}
            value={values.fechaInicioMatricula}
            onChange={(event) => updateField("fechaInicioMatricula", event.target.value)}
          />
          <Input
            label="Fin de matrícula"
            name="fechaFinMatricula"
            type="date"
            required
            max={maxDate}
            error={fieldErrors.fechaFinMatricula}
            value={values.fechaFinMatricula}
            onChange={(event) => updateField("fechaFinMatricula", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">Ventana de curso</p>
        <p className="text-xs text-text-secondary">
          Todas las prácticas que elija un estudiante de esta cohorte deben caber dentro de esta
          ventana.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Inicio de curso"
            name="fechaInicioCurso"
            error={fieldErrors.fechaInicioCurso}
            type="date"
            required
            max={maxDate}
            value={values.fechaInicioCurso}
            onChange={(event) => updateField("fechaInicioCurso", event.target.value)}
          />
          <Input
            label="Fin de curso"
            name="fechaFinCurso"
            type="date"
            required
            max={maxDate}
            error={fieldErrors.fechaFinCurso}
            value={values.fechaFinCurso}
            onChange={(event) => updateField("fechaFinCurso", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">
          Datos informativos para el oficio a la ANT (opcional)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Tipo de modalidad"
            name="tipoModalidad"
            error={fieldErrors.tipoModalidad}
            maxLength={COHORT_LIMITS.tipoModalidadMaxLength}
            value={values.tipoModalidad}
            onChange={(event) => updateField("tipoModalidad", event.target.value)}
          />
          <Input
            label="Horarios de capacitación teórica"
            name="horariosCapacitacionTeoria"
            error={fieldErrors.horariosCapacitacionTeoria}
            maxLength={COHORT_LIMITS.horariosMaxLength}
            value={values.horariosCapacitacionTeoria}
            onChange={(event) => updateField("horariosCapacitacionTeoria", event.target.value)}
          />
          <Input
            label="Número de vehículos"
            name="numeroVehiculos"
            error={fieldErrors.numeroVehiculos}
            type="number"
            min={COHORT_LIMITS.recursosMin}
            max={COHORT_LIMITS.recursosMax}
            step="1"
            value={values.numeroVehiculos}
            onChange={(event) => updateField("numeroVehiculos", event.target.value)}
          />
          <Input
            label="Número de aulas"
            name="numeroAulas"
            error={fieldErrors.numeroAulas}
            type="number"
            min={COHORT_LIMITS.recursosMin}
            max={COHORT_LIMITS.recursosMax}
            step="1"
            value={values.numeroAulas}
            onChange={(event) => updateField("numeroAulas", event.target.value)}
          />
        </div>
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" isLoading={isSubmitting}>
        {isEditMode ? "Guardar cambios" : "Crear cohorte"}
      </Button>
    </form>
  );
}
