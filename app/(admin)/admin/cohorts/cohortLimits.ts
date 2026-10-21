import { schoolCalendarDate } from "@/lib/utils/schoolTime";

// Límites del formulario de cohortes. Reflejan las reglas del servidor
// (contrato L3b, src/utils/cohortRules.ts del backend); el servidor sigue
// siendo la autoridad y estos atributos solo evitan envíos que rechazaría.
export const COHORT_LIMITS = {
  nombreMaxLength: 100,
  tipoModalidadMaxLength: 100,
  horariosMaxLength: 500,
  precioMin: "0",
  precioMax: "9999.99",
  precioStep: "0.01",
  cupoMin: "1",
  cupoMax: "500",
  recursosMin: "0",
  recursosMax: "100",
  aniosFuturoMax: 5,
} as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Fecha máxima (YYYY-MM-DD) que acepta el servidor: hoy + 5 años en la zona
 * de la escuela, día límite incluido. Un 29 de febrero pasa al 28 si el año
 * destino no es bisiesto (igual que el servidor).
 */
export function maxCohortDate(now: Date = new Date()): string {
  const today = schoolCalendarDate(now);
  const year = today.getFullYear() + COHORT_LIMITS.aniosFuturoMax;
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
