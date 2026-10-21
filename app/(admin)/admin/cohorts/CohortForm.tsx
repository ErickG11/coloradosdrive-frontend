"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, buttonClassName, FormError, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { CohortStudentCounts, Course } from "@/types";

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
  /**
   * Versión de la cohorte (updatedAt de GET /cohorts/:id) para el PATCH.
   * Se reenvía como cadena exacta: convertirla a Date pierde los
   * microsegundos y el servidor respondería siempre 409.
   */
  version?: string;
  initialValues?: CohortFormValues;
  /**
   * Vuelve a cargar la cohorte (GET /cohorts/:id) sin salir de la página.
   * Se ofrece en edición ante un 409 (otra persona la cambió) o si falta
   * la versión.
   */
  onReload?: () => void;
  /** Se llama cuando el usuario edita un campo o envía el formulario. */
  onUserActivity?: () => void;
  /** Matrículas de la cohorte (solo edición). Con alumnos no se cambia el curso. */
  alumnos?: CohortStudentCounts;
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

// «1 activo», «2 activos»: número con la palabra en singular o plural.
function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

// Cuerpo que se envía a la API (POST completo; PATCH añade updatedAt).
function buildBody(values: CohortFormValues) {
  return {
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
}

// Compara lo que se guardaría (no el texto escrito): «200» y «200.00», o un
// nombre con espacios extremos (el servidor lo recorta), cuentan como iguales.
function sameCohortData(a: CohortFormValues, b: CohortFormValues): boolean {
  const normalize = (values: CohortFormValues) =>
    JSON.stringify({ ...buildBody(values), nombre: values.nombre.trim() });
  return normalize(a) === normalize(b);
}

export function CohortForm({
  courses,
  cohortId,
  version,
  initialValues,
  onReload,
  onUserActivity,
  alumnos,
}: CohortFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditMode = Boolean(cohortId);
  // El servidor rechaza cambiar el curso si hay matrículas de cualquier estado
  // (COHORT_HAS_STUDENTS); aquí se bloquea y se explica antes de enviar.
  const courseLocked = isEditMode && (alumnos?.total ?? 0) > 0;
  const activeStudents = isEditMode ? (alumnos?.activos ?? 0) : 0;
  const [values, setValues] = useState<CohortFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReload, setCanReload] = useState(false);
  const [noChanges, setNoChanges] = useState(false);
  // Campo que debe recibir el foco cuando ya se haya pintado su error.
  const pendingFocusRef = useRef<keyof CohortFormValues | null>(null);
  // El servidor rechaza fechas posteriores a hoy + 5 años.
  const [maxDate] = useState(() => maxCohortDate());

  function updateField<K extends keyof CohortFormValues>(field: K, value: CohortFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    onUserActivity?.();
    setNoChanges(false);
    const cleared = [field, ...(RELATED_ERRORS[field] ?? [])];
    setFieldErrors((current) => {
      if (!cleared.some((name) => current[name])) return current;
      const next = { ...current };
      for (const name of cleared) delete next[name];
      return next;
    });
  }

  // El foco se mueve tras el render, cuando el campo ya tiene aria-invalid y
  // aria-describedby apuntando a su mensaje.
  useEffect(() => {
    const field = pendingFocusRef.current;
    if (!field) return;
    pendingFocusRef.current = null;
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }, [fieldErrors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUserActivity?.();
    setError(null);
    setCanReload(false);
    setNoChanges(false);

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

    // Edición sin cambios: no se llama a la API (guardar cambiaría la
    // versión aunque los datos sean los mismos).
    if (isEditMode && initialValues && sameCohortData(values, initialValues)) {
      setNoChanges(true);
      return;
    }

    setIsSubmitting(true);

    const body = buildBody(values);

    try {
      if (cohortId) {
        await api.patch(`/cohorts/${cohortId}`, { ...body, updatedAt: version });
      } else {
        await api.post("/cohorts", body);
      }
      // El listado muestra el aviso de éxito y limpia el parámetro de la URL.
      router.push(`/admin/cohorts?aviso=${isEditMode ? "cohorte-guardada" : "cohorte-creada"}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && isFormField(err.field)) {
        // Error de un campo concreto (400 de validación, 404 de curso,
        // 409 de nombre duplicado): se muestra junto a ese campo.
        pendingFocusRef.current = err.field;
        setFieldErrors({ [err.field]: err.message });
      } else {
        setError(err instanceof ApiError ? err.message : "No se pudo guardar la cohorte.");
      }
      // Cualquier 409 (versión, nombre, curso, cupo, franjas) puede deberse
      // a datos que otra persona cambió: se invita a recargar (contrato L4b).
      if (
        isEditMode &&
        onReload &&
        err instanceof ApiError &&
        // 404: la cohorte se eliminó; al recargar se ve «No se encontró la cohorte.».
        (err.status === 409 || err.status === 404 || err.field === "updatedAt")
      ) {
        setCanReload(true);
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
        disabled={courseLocked}
        {...(courseLocked ? { "aria-describedby": "courseId-locked" } : {})}
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
      {courseLocked && alumnos ? (
        <p id="courseId-locked" className="-mt-2 text-xs text-text-secondary">
          {`No se puede cambiar el curso porque la cohorte tiene ${count(alumnos.total, "alumno asociado", "alumnos asociados")}: ` +
            `${count(alumnos.activos, "activo", "activos")}, ${count(alumnos.finalizados, "finalizado", "finalizados")} ` +
            `y ${count(alumnos.retirados, "retirado", "retirados")}.`}
        </p>
      ) : null}

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
        <div className="flex flex-col gap-1">
          <Input
            label="Cupo máximo"
            name="cupoMaximo"
            error={fieldErrors.cupoMaximo}
            type="number"
            min={COHORT_LIMITS.cupoMin}
            max={COHORT_LIMITS.cupoMax}
            step="1"
            required
            {...(activeStudents > 0 ? { "aria-describedby": "cupoMaximo-activos" } : {})}
            value={values.cupoMaximo}
            onChange={(event) => updateField("cupoMaximo", event.target.value)}
          />
          {activeStudents > 0 ? (
            <p id="cupoMaximo-activos" className="text-xs text-text-secondary">
              {`Alumnos activos: ${activeStudents}. El cupo máximo no puede ser menor.`}
            </p>
          ) : null}
        </div>
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

      {canReload ? (
        <div className="flex flex-col items-start gap-2">
          {error ? null : (
            <p className="text-sm text-text-secondary">
              Si otra persona cambió la cohorte, recarga para ver los datos actuales.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            aria-describedby="cohort-reload-warning"
            onClick={onReload}
          >
            Recargar
          </Button>
          <p id="cohort-reload-warning" className="text-xs text-text-secondary">
            Recargar descarta los cambios que no guardaste.
          </p>
        </div>
      ) : null}

      {noChanges ? (
        <p role="status" className="text-sm text-text-secondary">
          No hay cambios que guardar.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Volver sin guardar: por simpleza no se pregunta si hay cambios. */}
        <Link href="/admin/cohorts" className={buttonClassName("secondary")}>
          Cancelar
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          {isEditMode ? "Guardar cambios" : "Crear cohorte"}
        </Button>
      </div>
    </form>
  );
}
