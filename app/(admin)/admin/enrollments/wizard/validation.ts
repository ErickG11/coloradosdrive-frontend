import { birthDateError, schoolToday } from "@/lib/utils/birthDate";
import { isValidCedulaEcuatoriana } from "@/lib/utils/cedula";
import type { ApiError } from "@/lib/api/errors";
import {
  horasPorDiaError,
  type CourseSelection,
  type PracticeFormData,
  type StudentData,
  type WizardStep,
} from "./wizardTypes";

// Mensajes literales del contrato del servidor (POST /admin/manual-enrollments/*).
export const MESSAGES = {
  cedulaObligatoria: "Ingresa la cédula.",
  cedula: "Ingresa una cédula ecuatoriana válida de 10 dígitos.",
  nombreObligatorio: "Ingresa el nombre completo.",
  nombreLargo: "El nombre completo no puede superar 200 caracteres.",
  nombre: "El nombre completo debe incluir letras y no puede contener números.",
  correoObligatorio: "Ingresa el correo electrónico.",
  correoLargo: "El correo no puede superar 254 caracteres.",
  correo: "Ingresa un correo electrónico válido.",
  telefono:
    "Ingresa un teléfono válido de 7 a 20 caracteres (solo dígitos, +, espacios, guiones y paréntesis).",
  studentId: "Selecciona un estudiante existente válido.",
  cedulaDuplicada: "La cédula ya existe. Busca y selecciona el estudiante existente.",
  correoDuplicado: "El correo ya existe. Busca y selecciona el estudiante existente.",
  tipoCurso: "Selecciona un tipo de curso válido.",
  cohorteOtroCurso: "La cohorte seleccionada no corresponde al curso elegido.",
  cohorteCerrada: "La matrícula de la cohorte no está abierta.",
  cohorteLlena: "La cohorte ya no tiene cupo disponible.",
  fechaInicioObligatoria: "Ingresa la fecha de inicio.",
  fechaInicio: "La fecha de inicio no es válida.",
  fechaFin: "La fecha final no es válida.",
  fechaFinAnterior: "La fecha final no puede ser anterior al inicio.",
  horaObligatoria: "Ingresa la hora deseada.",
  horaDeseada: "La hora deseada debe estar entre 06:00 y 22:00.",
  horaNoCabe:
    "Con las horas por día elegidas, la práctica debe terminar a más tardar a las 22:00. Elige una hora más temprana o menos horas por día.",
  instructor: "Selecciona un instructor antes de confirmar.",
  // Solo cliente: el servidor no tiene un equivalente para este paso.
  sugerencia: "Pulsa «Ver sugerencia» y selecciona un instructor antes de continuar.",
  abonoCero: "Con la modalidad Abono, el monto abonado debe ser mayor que $0.00.",
} as const;

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9() -]{7,20}$/;

export type StudentField = "cedula" | "nombreCompleto" | "correo" | "telefono" | "fechaNacimiento";

/** Paso 1 (estudiante nuevo). Misma regla y mismos mensajes que el servidor. */
export function validateStudent(
  s: Pick<StudentData, "cedula" | "nombreCompleto" | "correo" | "telefono" | "fechaNacimiento">,
  now: Date = new Date(),
): FieldErrors<StudentField> {
  const errors: FieldErrors<StudentField> = {};
  if (!s.cedula) errors.cedula = MESSAGES.cedulaObligatoria;
  else if (!isValidCedulaEcuatoriana(s.cedula)) errors.cedula = MESSAGES.cedula;
  const nombre = s.nombreCompleto.trim();
  if (!nombre) errors.nombreCompleto = MESSAGES.nombreObligatorio;
  else if ([...nombre].length > 200) errors.nombreCompleto = MESSAGES.nombreLargo;
  else if (!/\p{L}/u.test(nombre) || /\d/.test(nombre)) errors.nombreCompleto = MESSAGES.nombre;
  const correo = s.correo.trim();
  if (!correo) errors.correo = MESSAGES.correoObligatorio;
  else if (correo.length > 254) errors.correo = MESSAGES.correoLargo;
  else if (!EMAIL.test(correo)) errors.correo = MESSAGES.correo;
  const telefono = s.telefono.trim();
  if (telefono && !(PHONE.test(telefono) && telefono.replace(/\D/g, "").length >= 7))
    errors.telefono = MESSAGES.telefono;
  if (s.fechaNacimiento) {
    const message = birthDateError(s.fechaNacimiento, now);
    if (message) errors.fechaNacimiento = message;
  }
  return errors;
}

/** Paso 2: la cohorte elegida debe corresponder al curso, estar abierta y tener cupo. */
export function validateCourse(
  selection: CourseSelection | null,
  today: string = schoolToday(),
): { field: "courseType" | "cohortId"; message: string } | null {
  if (!selection) return { field: "courseType", message: MESSAGES.tipoCurso };
  const { cohort } = selection;
  if (!selection.cohortId || !cohort) return null; // pendiente de cohorte
  if (cohort.course_id !== selection.courseId)
    return { field: "cohortId", message: MESSAGES.cohorteOtroCurso };
  if (today < cohort.fecha_inicio_matricula || today > cohort.fecha_fin_matricula)
    return { field: "cohortId", message: MESSAGES.cohorteCerrada };
  if (cohort.cupo_maximo - cohort.ocupados <= 0)
    return { field: "cohortId", message: MESSAGES.cohorteLlena };
  return null;
}

export type PracticeField = "fechaInicio" | "horaDeseada" | "horasPorDia" | "fechaFin";

/** Paso 3: campos del formulario de prácticas (el instructor se valida aparte). */
export function validatePractice(form: PracticeFormData): FieldErrors<PracticeField> {
  const errors: FieldErrors<PracticeField> = {};
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!form.fechaInicio) errors.fechaInicio = MESSAGES.fechaInicioObligatoria;
  else if (!isDate(form.fechaInicio)) errors.fechaInicio = MESSAGES.fechaInicio;
  const horas = horasPorDiaError(form.horasPorDia);
  if (horas) errors.horasPorDia = horas;
  if (!form.horaDeseada) errors.horaDeseada = MESSAGES.horaObligatoria;
  else {
    const match = /^(\d{2}):(\d{2})$/.exec(form.horaDeseada);
    const minutes = match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
    if (!(minutes >= 360 && minutes <= 1320)) errors.horaDeseada = MESSAGES.horaDeseada;
    else if (
      typeof form.horasPorDia === "number" &&
      !horas &&
      minutes + form.horasPorDia * 60 > 1320
    )
      errors.horaDeseada = MESSAGES.horaNoCabe;
  }
  if (form.manual) {
    if (!isDate(form.fechaFin)) errors.fechaFin = MESSAGES.fechaFin;
    else if (!errors.fechaInicio && form.fechaFin < form.fechaInicio)
      errors.fechaFin = MESSAGES.fechaFinAnterior;
  }
  return errors;
}

const STEP_BY_PREFIX: [RegExp, WizardStep][] = [
  [/^student\./, 1],
  [/^(courseType|automatic|cohortId)$/, 2],
  [/^practice\./, 3],
  [/^(pago|documentos)/, 4],
];

export interface ServerFieldError {
  step: WizardStep;
  /** Campo del cuerpo sin prefijo, p. ej. "cedula" para student.cedula. */
  field: string;
  message: string;
}

/**
 * Convierte un error del servidor con `field` en el paso del asistente que
 * contiene ese campo. Devuelve null si el error no trae campo conocido.
 */
export function serverFieldError(error: ApiError): ServerFieldError | null {
  if (!error.field) return null;
  const hit = STEP_BY_PREFIX.find(([pattern]) => pattern.test(error.field ?? ""));
  if (!hit) return null;
  return {
    step: hit[1],
    field: error.field.replace(/^(student|practice|pago)\./, ""),
    message: error.message,
  };
}

/** Enfoca el primer control con el id dado que exista (en orden de aparición). */
export function focusFirst(ids: readonly string[]): void {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      return;
    }
  }
}
