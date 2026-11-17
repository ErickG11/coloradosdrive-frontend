import { SCHOOL_TIME_ZONE } from "@/lib/utils/schoolTime";

// Límites de PLAUSIBILIDAD de la fecha de nacimiento (no son una regla legal).
// Mismos valores y mensajes que utils/birthDate.ts del backend.
export const BIRTH_AGE_MIN = 15;
export const BIRTH_AGE_MAX = 100;

// Edad legal mínima para matricularse (18 según la ANT; pendiente de confirmar
// con la escuela). Está DESACTIVADA a propósito: mientras ENFORCE_LEGAL_MIN_AGE
// sea false, la edad mínima aplicada es BIRTH_AGE_MIN. Para activarla basta
// cambiar la bandera a true.
export const LEGAL_MIN_AGE = 18;
export const ENFORCE_LEGAL_MIN_AGE = false as boolean;

// Un mensaje por caso, idénticos a los del servidor (utils/birthDate.ts del
// backend). «Hoy» tiene 0 años: cae en el caso de menor de la edad mínima; solo
// una fecha posterior a hoy dice «futura». El campo de fecha NO lleva min ni
// max: el calendario deja elegir cualquier fecha y estos mensajes explican el
// motivo del rechazo.
export const BIRTH_DATE_MESSAGES = {
  invalida: "La fecha de nacimiento no es válida.",
  futura: "La fecha de nacimiento no puede ser futura.",
  edadMinima: `La edad mínima para registrar a un estudiante es de ${String(BIRTH_AGE_MIN)} años.`,
  edadMaxima: `La edad máxima permitida es de ${String(BIRTH_AGE_MAX)} años.`,
  edadLegal: "El alumno debe tener al menos 18 años.",
} as const;

// Codes que devuelve el servidor para esos mismos casos.
export const BIRTH_DATE_CODES = {
  futura: "BIRTH_DATE_FUTURE",
  edadMinima: "BIRTH_DATE_TOO_YOUNG",
  edadMaxima: "BIRTH_DATE_TOO_OLD",
  edadLegal: "BIRTH_DATE_UNDER_LEGAL_AGE",
} as const;

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día de hoy en Guayaquil como «AAAA-MM-DD» (no el del reloj del navegador). */
export function schoolToday(now: Date = new Date()): string {
  const parts = todayFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Edad cumplida en años enteros a la fecha `today` (ambas «AAAA-MM-DD»). */
export function ageOn(birth: string, today: string): number {
  return (
    Number(today.slice(0, 4)) -
    Number(birth.slice(0, 4)) -
    (today.slice(5) < birth.slice(5) ? 1 : 0)
  );
}

/**
 * Única función de validación de fecha de nacimiento del cliente. Devuelve el
 * mensaje en español o null si es válida. El campo vacío no se valida aquí
 * (la fecha es opcional). «Hoy» es el día de Guayaquil.
 */
export function birthDateError(value: string, now: Date = new Date()): string | null {
  if (!isRealDate(value)) return BIRTH_DATE_MESSAGES.invalida;
  const today = schoolToday(now);
  if (value > today) return BIRTH_DATE_MESSAGES.futura;
  const age = ageOn(value, today);
  if (age < BIRTH_AGE_MIN) return BIRTH_DATE_MESSAGES.edadMinima; // incluye «hoy» (0 años)
  if (age > BIRTH_AGE_MAX) return BIRTH_DATE_MESSAGES.edadMaxima;
  if (ENFORCE_LEGAL_MIN_AGE && age < LEGAL_MIN_AGE) return BIRTH_DATE_MESSAGES.edadLegal;
  return null;
}
