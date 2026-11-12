"use client";

import Link from "next/link";
import { useFetch } from "@/hooks/useFetch";
import { CohortRulesControls, type CohortRulesConfig } from "./CohortRulesControls";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, FormError, Input, Select, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { CohortStudentCounts, Course } from "@/types";

import { COHORT_LIMITS, maxCohortDate } from "./cohortLimits";
import { CohortIcon } from "./CohortVisual";
import styles from "./cohorts.module.css";

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
  rulesState?: "matricula_abierta" | "matricula_cerrada_en_curso" | "terminada";
  codigo?: string | null;
  habilitadaInicial?: boolean;
  cierreMatricula?: string;
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
  /**
   * Dentro del panel lateral del listado: en vez de navegar al listado con
   * ?aviso=..., avisa al panel para que se cierre y muestre el mensaje.
   */
  onSaved?: (notice: CohortSavedNotice) => void;
  /** Dentro del panel lateral: «Cancelar» cierra el panel en vez de navegar. */
  onCancel?: () => void;
}

export type CohortSavedNotice = "cohorte-creada" | "cohorte-guardada";

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
  rulesState,
  codigo,
  habilitadaInicial = true,
  cierreMatricula,
  version,
  initialValues,
  onReload,
  onUserActivity,
  alumnos,
  onSaved,
  onCancel,
}: CohortFormProps) {
  const [savedOffer, setSavedOffer] = useState<{
    id: string;
    count?: number;
    ranges?: { type: string; from: string; to: string; cutoff: string }[];
    type?: string;
    error?: string;
  } | null>(null);
  const [notifying, setNotifying] = useState(false);
  function finishSaved() {
    setSavedOffer(null);
    const notice: CohortSavedNotice = cohortId ? "cohorte-guardada" : "cohorte-creada";
    if (onSaved) onSaved(notice);
    else {
      router.push(`/admin/cohorts?aviso=${notice}`);
      router.refresh();
    }
  }
  async function previewOffer(id: string) {
    try {
      const offer = await api.post<{ count: number; type?: string }>(
        `/cohorts/${id}/espera/preview`,
        {},
      );
      if (offer.count > 0) setSavedOffer({ id, ...offer });
      else finishSaved();
    } catch (error) {
      setSavedOffer({
        id,
        error:
          error instanceof Error
            ? `La cohorte se guardó. ${error.message}`
            : "La cohorte se guardó, pero no se pudo consultar el aviso. Recarga antes de notificar.",
      });
    }
  }
  async function notify() {
    if (!savedOffer) return;
    setNotifying(true);
    try {
      await api.post(`/cohorts/${savedOffer.id}/espera/notificar`, {});
      finishSaved();
    } catch (error) {
      setSavedOffer({
        ...savedOffer,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar la cola. Reintenta la misma acción; no duplica el evento.",
      });
    } finally {
      setNotifying(false);
    }
  }
  const router = useRouter();
  const rules = useFetch<CohortRulesConfig>("/cohorts/configuracion");
  const [habilitada, setHabilitada] = useState(habilitadaInicial);
  const [reason, setReason] = useState("");
  const readOnly = rules.data?.active && rulesState === "terminada";

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
  // Cuenta los intentos sin cambios: cada uno vuelve a anunciar el mensaje.
  const [noChangesCount, setNoChangesCount] = useState(0);
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
    pendingFocusRef.current = dateErrors.fechaFinMatricula
      ? "fechaFinMatricula"
      : dateErrors.fechaFinCurso
        ? "fechaFinCurso"
        : null;
    setFieldErrors(dateErrors);
    if (Object.keys(dateErrors).length > 0) return;

    // Edición sin cambios: no se llama a la API (guardar cambiaría la
    // versión aunque los datos sean los mismos).
    if (
      isEditMode &&
      initialValues &&
      sameCohortData(values, initialValues) &&
      (!rules.data?.active || habilitada === habilitadaInicial)
    ) {
      setNoChanges(true);
      setNoChangesCount((count) => count + 1);
      return;
    }

    setIsSubmitting(true);

    const body = buildBody(
      rules.data?.active ? { ...values, precio: values.precio || "0" } : values,
    );

    try {
      let saved: { id: string };
      if (cohortId) {
        saved = await api.patch<{ id: string }>(`/cohorts/${cohortId}`, {
          ...body,
          updatedAt: version,
          ...(rules.data?.active ? { habilitada, reason: reason.trim() } : {}),
        });
      } else {
        saved = await api.post<{ id: string }>("/cohorts", {
          ...body,
          ...(rules.data?.active ? { habilitada, reason: reason.trim() } : {}),
        });
      }
      if (
        rules.data?.active &&
        habilitada &&
        (!cohortId ||
          !habilitadaInicial ||
          values.fechaFinMatricula > (initialValues?.fechaFinMatricula ?? "") ||
          values.fechaFinCurso > (initialValues?.fechaFinCurso ?? ""))
      ) {
        await previewOffer(saved.id);
        setIsSubmitting(false);
        return;
      }
      const notice: CohortSavedNotice = isEditMode ? "cohorte-guardada" : "cohorte-creada";
      if (onSaved) {
        setIsSubmitting(false);
        onSaved(notice);
        return;
      }
      // El listado muestra el aviso de éxito y limpia el parámetro de la URL.
      router.push(`/admin/cohorts?aviso=${notice}`);
      router.refresh();
    } catch (err) {
      if (
        err instanceof ApiError &&
        ["IC409", "COHORT_CUPO_BELOW_ACTIVE"].includes(err.code ?? "")
      ) {
        pendingFocusRef.current = "cupoMaximo";
        setFieldErrors({
          cupoMaximo:
            "El cupo máximo no puede ser menor que las matrículas activas y las reservas vigentes. Aumenta el cupo o recarga la cohorte.",
        });
      } else if (err instanceof ApiError && isFormField(err.field)) {
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
        (err.status === 409 || err.code === "COHORT_NOT_FOUND" || err.field === "updatedAt")
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
      className={styles.form}
      aria-busy={isSubmitting}
    >
      <Modal
        isOpen={savedOffer !== null}
        title={
          savedOffer?.count
            ? `¿Notificar a ${savedOffer.count} interesados del tipo ${savedOffer.type}?`
            : "Comprobar aviso de apertura"
        }
        onClose={() => {
          if (!notifying) finishSaved();
        }}
      >
        <p>
          La cohorte ya se guardó. El correo indicará que la asignación está sujeta a cupos
          disponibles. La marca se retira después de confirmar la entrega.
        </p>
        {savedOffer?.ranges?.map((range, i) => (
          <p key={i}>
            Tipo {range.type}: prácticas del {range.from} al {range.to}; inscripción hasta{" "}
            {range.cutoff}.
          </p>
        ))}
        {savedOffer?.error ? <p role="alert">{savedOffer.error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {savedOffer?.count ? (
            <Button type="button" isLoading={notifying} onClick={() => void notify()}>
              Notificar
            </Button>
          ) : (
            <Button
              type="button"
              disabled={notifying}
              onClick={() => {
                if (savedOffer) void previewOffer(savedOffer.id);
              }}
            >
              Reintentar consulta
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={notifying} onClick={finishSaved}>
            Terminar sin notificar
          </Button>
        </div>
      </Modal>
      {rules.error ? <p role="alert">{rules.error}</p> : null}
      {rules.data?.active ? (
        <>
          <p>
            Código: {codigo ?? "Se genera al guardar"} · Estado: {rulesState ?? "Nueva cohorte"}
            {cierreMatricula ? ` · Cierre: ${cierreMatricula} a las 23:59:59` : ""}
          </p>
          <label>
            <input
              type="checkbox"
              checked={habilitada}
              disabled={readOnly || isSubmitting}
              onChange={(e) => setHabilitada(e.target.checked)}
            />{" "}
            Habilitada para futuras inscripciones
          </label>
          <p>Deshabilitar no quita acceso a quien ya pagó.</p>
          <Input
            label="Motivo de la edición"
            value={reason}
            maxLength={500}
            required
            onChange={(e) => setReason(e.target.value)}
            disabled={readOnly || isSubmitting}
          />
          {readOnly ? <p role="status">Cohorte terminada: solo lectura.</p> : null}
          {rulesState === "matricula_cerrada_en_curso" &&
          values.fechaFinCurso !== initialValues?.fechaFinCurso &&
          values.fechaFinMatricula === initialValues?.fechaFinMatricula ? (
            <p role="status">
              ¿Extender también la matrícula? Cambiar solo el fin del curso no reabre la matrícula.
            </p>
          ) : null}
          <CohortRulesControls config={rules.data} onUpdated={rules.refetch} />
        </>
      ) : null}
      <fieldset className={styles.section} disabled={Boolean(readOnly)}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="layers" />
          </span>
          Información general
        </legend>
        <div className={styles.formGrid}>
          <div className="flex min-w-0 flex-col gap-1">
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
              <p id="courseId-locked" className="text-xs text-text-secondary">
                {`No se puede cambiar el curso porque la cohorte tiene ${count(alumnos.total, "alumno asociado", "alumnos asociados")}: ` +
                  `${count(alumnos.activos, "activo", "activos")}, ${count(alumnos.finalizados, "finalizado", "finalizados")} ` +
                  `y ${count(alumnos.retirados, "retirado", "retirados")}.`}
              </p>
            ) : null}
          </div>

          <Input
            placeholder="Ej. Cohorte octubre 2026"
            label="Nombre de la cohorte"
            name="nombre"
            error={fieldErrors.nombre}
            required
            maxLength={COHORT_LIMITS.nombreMaxLength}
            value={values.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={Boolean(readOnly)}>
        <legend>
          <span className={styles.sectionIcon}>
            <CohortIcon name="money" />
          </span>
          Precios y capacidad
        </legend>
        <div className={styles.formGrid}>
          <Input
            placeholder="0.00 USD"
            label={rules.data?.active ? "Precio histórico de cohorte (informativo)" : "Precio"}
            disabled={Boolean(rules.data?.active)}
            name="precio"
            error={fieldErrors.precio}
            type="number"
            min={COHORT_LIMITS.precioMin}
            max={COHORT_LIMITS.precioMax}
            step={COHORT_LIMITS.precioStep}
            required={!rules.data?.active}
            value={rules.data?.active ? values.precio || "0" : values.precio}
            onChange={(event) => updateField("precio", event.target.value)}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <Input
              placeholder="Ej. 20"
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
      </fieldset>

      <fieldset className={styles.section} disabled={Boolean(readOnly)}>
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
      </fieldset>

      <fieldset className={styles.section} disabled={Boolean(readOnly)}>
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
      </fieldset>

      <fieldset className={styles.section} disabled={Boolean(readOnly)}>
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
            error={fieldErrors.tipoModalidad}
            maxLength={COHORT_LIMITS.tipoModalidadMaxLength}
            value={values.tipoModalidad}
            onChange={(event) => updateField("tipoModalidad", event.target.value)}
          />
          <Input
            placeholder="Ej. Lunes y miércoles, 18:00–20:00"
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
      </fieldset>

      {error ? <FormError className={styles.formError}>{error}</FormError> : null}

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

      {/* Región viva siempre montada; la clave del texto fuerza un nuevo anuncio. */}
      <p role="status" className="text-sm text-text-secondary empty:-mb-4">
        {noChanges ? <span key={noChangesCount}>No hay cambios que guardar.</span> : null}
      </p>

      <footer className={styles.formFooter}>
        <div>
          {/* Volver sin guardar: por simpleza no se pregunta si hay cambios. */}
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting || Boolean(readOnly)}
            >
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
