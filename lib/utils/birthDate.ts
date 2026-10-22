import { SCHOOL_TIME_ZONE } from "@/lib/utils/schoolTime";

// Límites de PLAUSIBILIDAD de la fecha de nacimiento (no son una regla legal).
// Mismos valores y mensajes que utils/birthDate.ts del backend.
export const BIRTH_AGE_MIN = 15;
export const BIRTH_AGE_MAX = 100;

// Edad legal mínima para matricularse (18 según la ANT; pendiente de confirmar
// con la escuela). Está DESACTIVADA a propósito: mientras ENFORCE_LEGAL_MIN_AGE
// sea false, la edad mínima aplicada es BIRTH_AGE_MIN. Para activarla basta
// cambiar la bandera a true (y subir el max de birthDateBounds en consecuencia).
export const LEGAL_MIN_AGE = 18;
export const ENFORCE_LEGAL_MIN_AGE = false as boolean;

export const BIRTH_DATE_MESSAGES = {
  invalida: "La fecha de nacimiento no es válida.",
  hoyOFutura: "La fecha de nacimiento no puede ser hoy ni una fecha futura.",
  edad: "La edad debe estar entre 15 y 100 años.",
  edadLegal: "El alumno debe tener al menos 18 años.",
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

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

function shiftYears(date: string, years: number): string {
  const year = Number(date.slice(0, 4)) + years;
  const monthDay = date.slice(5);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return `${pad(year, 4)}-${monthDay === "02-29" && !leap ? "02-28" : monthDay}`;
}

/**
 * Valores para los atributos min y max del campo de fecha, coherentes con
 * `birthDateError`: el más antiguo con 100 años cumplidos y el más reciente
 * con 15 cumplidos.
 */
export function birthDateBounds(now: Date = new Date()): { min: string; max: string } {
  const today = schoolToday(now);
  const max = shiftYears(today, -BIRTH_AGE_MIN);
  // Nace el día siguiente a «hoy hace 101 años»: ese día aún tiene 100 años.
  const limit = shiftYears(today, -(BIRTH_AGE_MAX + 1));
  const next = new Date(
    Date.UTC(Number(limit.slice(0, 4)), Number(limit.slice(5, 7)) - 1, Number(limit.slice(8))),
  );
  next.setUTCDate(next.getUTCDate() + 1);
  // Hoy 29 de febrero y el año de hace 101 no es bisiesto: el límite es el 1 de marzo.
  const min =
    today.slice(5) === "02-29" && limit.slice(5) === "02-28"
      ? `${limit.slice(0, 4)}-03-01`
      : `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return { min, max };
}

/**
 * Única función de validación de fecha de nacimiento del cliente. Devuelve el
 * mensaje en español o null si es válida. El campo vacío no se valida aquí
 * (la fecha es opcional). «Hoy» es el día de Guayaquil.
 */
export function birthDateError(value: string, now: Date = new Date()): string | null {
  if (!isRealDate(value)) return BIRTH_DATE_MESSAGES.invalida;
  const today = schoolToday(now);
  if (value >= today) return BIRTH_DATE_MESSAGES.hoyOFutura;
  const age = ageOn(value, today);
  if (age < BIRTH_AGE_MIN || age > BIRTH_AGE_MAX) return BIRTH_DATE_MESSAGES.edad;
  if (ENFORCE_LEGAL_MIN_AGE && age < LEGAL_MIN_AGE) return BIRTH_DATE_MESSAGES.edadLegal;
  return null;
}
