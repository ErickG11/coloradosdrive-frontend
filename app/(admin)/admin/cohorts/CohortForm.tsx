"use client";

import Link from "next/link";
import { CohortIcon } from "./CohortVisual";
import styles from "./cohorts.module.css";

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

interface CohortFormProps {
  courses: Course[];
  /** Presente => modo edición (PATCH). Ausente => modo creación (POST). */
  cohortId?: string;
  initialValues?: CohortFormValues;
  onSaved?: () => void;
  onCancel?: () => void;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function CohortForm({
  courses,
  cohortId,
  initialValues,
  onSaved,
  onCancel,
}: CohortFormProps) {
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

    if (values.fechaFinMatricula < values.fechaInicioMatricula) {
      setError("El fin de matrícula no puede ser anterior al inicio de matrícula.");
      return;
    }
    if (values.fechaFinCurso < values.fechaInicioCurso) {
      setError("El fin de curso no puede ser anterior al inicio de curso.");
      return;
    }

    setIsSubmitting(true);

    const body = {
      courseId: values.courseId,
      nombre: values.nombre,
      precio: Number(values.precio),
      cupoMaximo: Number(values.cupoMaximo),
      fechaInicioMatricula: values.fechaInicioMatricula,
      fechaFinMatricula: values.fechaFinMatricula,
      fechaInicioCurso: values.fechaInicioCurso,
      fechaFinCurso: values.fechaFinCurso,
      tipoModalidad: optionalText(values.tipoModalidad),
      horariosCapacitacionTeoria: optionalText(values.horariosCapacitacionTeoria),
      numeroVehiculos: optionalInt(values.numeroVehiculos),
      numeroAulas: optionalInt(values.numeroAulas),
    };

    try {
      if (cohortId) {
        await api.patch(`/cohorts/${cohortId}`, body);
      } else {
        await api.post("/cohorts", body);
      }
      if (onSaved) onSaved();
      else router.push("/admin/cohorts");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la cohorte.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={styles.form}
      aria-busy={isSubmitting}
    >
      <fieldset className={styles.section}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="layers" />
          </span>
          Información general
        </legend>
        <div className={styles.formGrid}>
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
            placeholder="Ej. Cohorte octubre 2026"
            label="Nombre de la cohorte"
            name="nombre"
            required
            value={values.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="money" />
          </span>
          Precios y capacidad
        </legend>
        <div className={styles.formGrid}>
          <Input
            placeholder="0.00 USD"
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
            placeholder="Ej. 20"
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
      </fieldset>

      <fieldset className={styles.section}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="calendar" />
          </span>
          Ventana de matrícula
        </legend>
        <p id="enrollment-window-help" className={styles.sectionHelp}>
          El fin de matrícula es el plazo real que se comunica al estudiante para entregar
          documentos físicos completos.
        </p>
        <div className={styles.formGrid}>
          <Input
            aria-describedby="enrollment-window-help"
            label="Inicio de matrícula"
            name="fechaInicioMatricula"
            type="date"
            required
            value={values.fechaInicioMatricula}
            onChange={(event) => updateField("fechaInicioMatricula", event.target.value)}
          />
          <Input
            aria-describedby="enrollment-window-help"
            label="Fin de matrícula"
            name="fechaFinMatricula"
            type="date"
            required
            value={values.fechaFinMatricula}
            onChange={(event) => updateField("fechaFinMatricula", event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="car" />
          </span>
          Ventana de curso
        </legend>
        <p id="course-window-help" className={styles.sectionHelp}>
          Todas las prácticas que elija un estudiante de esta cohorte deben caber dentro de esta
          ventana.
        </p>
        <div className={styles.formGrid}>
          <Input
            aria-describedby="course-window-help"
            label="Inicio de curso"
            name="fechaInicioCurso"
            type="date"
            required
            value={values.fechaInicioCurso}
            onChange={(event) => updateField("fechaInicioCurso", event.target.value)}
          />
          <Input
            aria-describedby="course-window-help"
            label="Fin de curso"
            name="fechaFinCurso"
            type="date"
            required
            value={values.fechaFinCurso}
            onChange={(event) => updateField("fechaFinCurso", event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="document" />
          </span>
          Información adicional
          <span className={styles.optional}>ANT · opcional</span>
        </legend>
        <div className={styles.formGrid}>
          <Input
            placeholder="Ej. Presencial"
            label="Tipo de modalidad"
            name="tipoModalidad"
            value={values.tipoModalidad}
            onChange={(event) => updateField("tipoModalidad", event.target.value)}
          />
          <Input
            placeholder="Ej. Lunes y miércoles, 18:00–20:00"
            label="Horarios de capacitación teórica"
            name="horariosCapacitacionTeoria"
            value={values.horariosCapacitacionTeoria}
            onChange={(event) => updateField("horariosCapacitacionTeoria", event.target.value)}
          />
          <Input
            label="Número de vehículos"
            name="numeroVehiculos"
            type="number"
            min="0"
            step="1"
            value={values.numeroVehiculos}
            onChange={(event) => updateField("numeroVehiculos", event.target.value)}
          />
          <Input
            label="Número de aulas"
            name="numeroAulas"
            type="number"
            min="0"
            step="1"
            value={values.numeroAulas}
            onChange={(event) => updateField("numeroAulas", event.target.value)}
          />
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      ) : null}

      <footer className={styles.formFooter}>
        <div>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          ) : (
            <Link href="/admin/cohorts" className={styles.cancel}>
              Cancelar
            </Link>
          )}
          <Button className={styles.primary} type="submit" isLoading={isSubmitting}>
            {isEditMode ? "Guardar cambios" : "Crear cohorte"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
