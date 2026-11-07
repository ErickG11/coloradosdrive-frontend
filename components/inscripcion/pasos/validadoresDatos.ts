import { validStudentCedula } from "@/lib/api/studentProfile";
import { applicantAge } from "../applicantValidation";
import { nameError, normalizeApplicantName } from "../validation";

// Reglas del brief (S5) para el formulario de datos; el servidor sigue siendo la fuente de verdad.
const PATRON_NOMBRE = /^\p{L}[\p{L}\p{M}]*(?:[ '’-]\p{L}[\p{L}\p{M}]*)*$/u;
const PATRON_TELEFONO = /^(09\d{8}|0[2-7]\d{7})$/;
export const EDAD_MAXIMA = 100;

export function parteNombreError(value: string, etiqueta: string): string {
  const nombre = normalizeApplicantName(value);
  const largo = Array.from(nombre).length;
  if (largo === 0) return `Ingresa tus ${etiqueta}.`;
  if (largo < 2 || largo > 60) return `Tus ${etiqueta} deben tener de 2 a 60 caracteres.`;
  if (!PATRON_NOMBRE.test(nombre)) return "Usa solo letras, espacios, apóstrofe o guion.";
  return "";
}

export function cedulaError(value: string): string {
  if (!value) return "Ingresa tu cédula.";
  if (!/^\d{10}$/.test(value)) return "La cédula debe tener 10 dígitos.";
  return validStudentCedula(value) ? "" : "La cédula no es válida. Revisa los 10 dígitos.";
}

export function telefonoNormalizado(value: string): string {
  return value;
}

export function telefonoError(value: string): string {
  if (!value) return "Ingresa tu teléfono.";
  return PATRON_TELEFONO.test(value)
    ? ""
    : "Usa un celular de 10 dígitos (09) o un convencional de 9 dígitos (02 a 07), solo números.";
}

export function fechaNacimientoError(value: string, edadMinima: number): string {
  if (!value) return "Ingresa tu fecha de nacimiento.";
  const edad = applicantAge(value);
  if (!Number.isFinite(edad)) return "Ingresa una fecha de nacimiento real.";
  if (edad < 0) return "La fecha de nacimiento no puede ser futura.";
  if (edad > EDAD_MAXIMA) return "La edad máxima es de 100 años cumplidos.";
  if (edad < edadMinima) return `Debes tener al menos ${String(edadMinima)} años para este curso.`;
  return "";
}

export function representanteNombreError(value: string): string {
  return nameError(value);
}

export function representanteCedulaError(value: string, cedulaPostulante: string): string {
  const base = cedulaError(value);
  if (base) return base;
  return value === cedulaPostulante
    ? "La cédula del representante debe ser distinta de la tuya."
    : "";
}
