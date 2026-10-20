export type ValidatableElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/;

// Los límites de fecha llegan como "2026-10-19" o "2026-10-19T08:00"; se
// muestran como los lee la gente en Ecuador (día/mes/año).
function formatBound(element: ValidatableElement, value: string): string {
  if (element instanceof HTMLInputElement) {
    if (element.type === "date") {
      const match = DATE_ONLY.exec(value);
      if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    }
    if (element.type === "datetime-local") {
      const match = DATE_TIME.exec(value);
      if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`;
    }
  }
  return value;
}

function decimalPlaces(step: string): number {
  const decimals = step.split(".")[1];
  return decimals ? decimals.length : 0;
}

function missingValueMessage(element: ValidatableElement): string {
  if (element instanceof HTMLSelectElement) return "Selecciona una opción.";
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") return "Marca esta casilla para continuar.";
    if (element.type === "radio") return "Selecciona una opción.";
    if (element.type === "file") return "Selecciona un archivo.";
  }
  return "Completa este campo.";
}

function typeMismatchMessage(element: ValidatableElement): string {
  const type = element instanceof HTMLInputElement ? element.type : "";
  if (type === "email") return "Escribe un correo válido.";
  if (type === "url") return "Escribe una dirección web válida.";
  return "Escribe un valor válido.";
}

function badInputMessage(element: ValidatableElement): string {
  const type = element instanceof HTMLInputElement ? element.type : "";
  if (type === "number") return "Escribe un número válido.";
  if (type === "date" || type === "datetime-local") return "Escribe una fecha válida.";
  if (type === "time") return "Escribe una hora válida.";
  return "Escribe un valor válido.";
}

function stepMismatchMessage(element: ValidatableElement): string {
  const step = element instanceof HTMLInputElement ? element.step : "";
  if (step && step !== "any") {
    const decimals = decimalPlaces(step);
    if (Number(step) < 1 && decimals > 0) {
      return `Escribe un número con máximo ${decimals} ${decimals === 1 ? "decimal" : "decimales"}.`;
    }
    if (Number(step) >= 1) return `El valor debe ser un múltiplo de ${step}.`;
  }
  return "Escribe un valor válido.";
}

/**
 * Mensaje en español para el primer problema de validación nativa del
 * campo, o null si no hay ninguno que sea de las reglas del navegador
 * (un setCustomValidity del propio formulario no cuenta: ese mensaje ya
 * es del formulario).
 */
export function getValidationMessage(element: ValidatableElement): string | null {
  const { validity } = element;

  if (validity.valueMissing) return missingValueMessage(element);
  if (validity.typeMismatch) return typeMismatchMessage(element);
  if (validity.badInput) return badInputMessage(element);
  if (validity.patternMismatch) {
    // El atributo title describe el formato esperado (p. ej. "10 dígitos numéricos").
    return element.title
      ? `Usa el formato solicitado: ${element.title}.`
      : "Usa el formato solicitado.";
  }
  if (validity.tooShort) {
    return `Escribe al menos ${(element as HTMLInputElement | HTMLTextAreaElement).minLength} caracteres.`;
  }
  if (validity.tooLong) {
    return `Escribe como máximo ${(element as HTMLInputElement | HTMLTextAreaElement).maxLength} caracteres.`;
  }
  if (validity.rangeUnderflow) {
    return `El valor debe ser como mínimo ${formatBound(element, (element as HTMLInputElement).min)}.`;
  }
  if (validity.rangeOverflow) {
    return `El valor debe ser como máximo ${formatBound(element, (element as HTMLInputElement).max)}.`;
  }
  if (validity.stepMismatch) return stepMismatchMessage(element);

  return null;
}
