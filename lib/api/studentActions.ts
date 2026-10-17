import { api } from "./client";
import { ApiError } from "./errors";
import type { StudentAccessResult, StudentDeletionOperation } from "@/types/student";

export const studentDeletionsHref = "/admin/students/deletions";
// Solo un aviso fijo en la URL, nunca datos del alumno ni la confirmación.
export const studentDeletedHref = "/admin/students?aviso=alumno-eliminado";
export const setStudentAccess = (id: string, active: boolean) =>
  api.post<StudentAccessResult>(
    `/admin/estudiantes/${id}/${active ? "reactivar" : "desactivar"}`,
    {},
  );
export const deleteStudent = (id: string, confirmation?: string) =>
  api.post<StudentDeletionOperation>(
    `/admin/estudiantes/${id}/eliminar`,
    confirmation === undefined ? {} : { confirmacionCedula: confirmation },
  );

export function studentActionError(error: unknown): {
  message: string;
  pending?: boolean;
  verify?: boolean;
  invalidConfirmation?: boolean;
} {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "CD030" || code === "DELETION_PENDING")
    return {
      message: "El alumno tiene una eliminación pendiente. Consulta su estado para reanudarla.",
      pending: true,
    };
  if (code === "DELETION_INCOMPLETE")
    return {
      message:
        "La eliminación no terminó. Consulta las eliminaciones pendientes y pulsa Reintentar eliminación.",
      pending: true,
    };
  if (code === "INVALID_CONFIRMATION")
    return {
      message:
        "La cédula de confirmación no coincide con la registrada. Recarga la ficha y compruébala.",
      invalidConfirmation: true,
    };
  if (code === "ACCOUNT_INACTIVE")
    return {
      message: "La cuenta del alumno está inactiva. Recarga la ficha para verificar el acceso.",
      verify: true,
    };
  if (!(error instanceof ApiError) || code === "UNCONFIRMED" || error.status === 503)
    return {
      message: "No se pudo confirmar el cambio; recarga la ficha y verifica antes de reintentar.",
      verify: true,
    };
  return { message: error.message };
}
