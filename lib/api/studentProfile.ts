import type { StudentDetail } from "@/types/student";
import { ApiError } from "./errors";

export const studentFieldLabels = {
  nombreCompleto: "Nombre completo",
  cedula: "Cédula",
  telefono: "Teléfono",
  fechaNacimiento: "Fecha de nacimiento",
  tipoSangre: "Tipo de sangre",
  genero: "Género",
  ciudadania: "Ciudadanía",
  direccion: "Dirección",
  correo: "Correo electrónico",
} as const;
export type ProfileField = keyof typeof studentFieldLabels;
export type StudentDraft = Record<ProfileField, string>;
export type StudentPatch = { updatedAt: string } & Partial<Record<ProfileField, string | null>>;
export interface StudentSaveResult {
  operationId: string;
  updatedAt: string;
  changedFields: string[];
}
export const profileLimits: Partial<Record<ProfileField, number>> = {
  nombreCompleto: 200,
  cedula: 10,
  telefono: 20,
  tipoSangre: 500,
  genero: 500,
  ciudadania: 500,
  direccion: 500,
  correo: 254,
};
const fields = Object.keys(studentFieldLabels) as ProfileField[];
const required = new Set<ProfileField>(["nombreCompleto", "cedula", "correo"]);
export function studentDraft(student: StudentDetail): StudentDraft {
  return Object.fromEntries(fields.map((field) => [field, student[field] ?? ""])) as StudentDraft;
}
function normalized(field: ProfileField, value: string): string | null {
  const text = field === "cedula" || field === "correo" ? value : value.trim();
  return text === "" && !required.has(field) ? null : text;
}
export function buildStudentPatch(
  student: StudentDetail,
  draft: StudentDraft,
): StudentPatch | null {
  const patch: StudentPatch = { updatedAt: student.updatedAt };
  for (const field of fields) {
    if (field === "correo" && !student.correoDisponible) continue;
    const value = normalized(field, draft[field]);
    if (value !== normalized(field, student[field] ?? "")) patch[field] = value;
  }
  return Object.keys(patch).length === 1 ? null : patch;
}
export function validStudentCedula(value: string): boolean {
  if (!/^[0-9]{10}$/.test(value)) return false;
  const province = Number(value.slice(0, 2));
  if (((province < 1 || province > 24) && province !== 30) || Number(value[2]) >= 6) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(value[i]) * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}
export function validateStudentPatch(patch: StudentPatch): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};
  for (const field of fields) {
    const value = patch[field];
    if (value === undefined) continue;
    if (required.has(field) && !value?.trim()) {
      errors[field] = "Este campo es obligatorio.";
      continue;
    }
    const max = profileLimits[field];
    if (value !== null && max && [...value].length > max)
      errors[field] = `Máximo ${max} caracteres.`;
    else if (field === "cedula" && !validStudentCedula(value ?? ""))
      errors[field] = "Cédula ecuatoriana inválida.";
    else if (field === "fechaNacimiento" && value !== null && !validDate(value))
      errors[field] = "Introduce una fecha válida (AAAA-MM-DD).";
    else if (field === "correo" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? ""))
      errors[field] = "Introduce un correo válido.";
  }
  return errors;
}
export const unconfirmedMessage =
  "No se pudo confirmar el cambio; recarga la ficha y verifica antes de reintentar";
export function studentEditError(error: unknown): {
  message: string;
  field?: ProfileField;
  reload?: boolean;
} {
  if (!(error instanceof ApiError)) return { message: unconfirmedMessage, reload: true };
  if (error.status === 503 || error.code === "UNCONFIRMED")
    return { message: unconfirmedMessage, reload: true };
  if (
    error.code === "VERSION_CONFLICT" ||
    (!error.code &&
      error.status === 409 &&
      /versi[oó]n|alumno cambi[oó]|otro administrador|recarga la ficha/i.test(error.message))
  )
    return { message: "Otro administrador modificó este alumno; recarga la ficha.", reload: true };
  if (error.code === "CEDULA_DUPLICATE") return { message: error.message, field: "cedula" };
  if (error.code === "EMAIL_DUPLICATE") return { message: error.message, field: "correo" };
  if (error.code && fields.includes(error.field as ProfileField))
    return { message: error.message, field: error.field as ProfileField };
  return { message: error.message };
}
