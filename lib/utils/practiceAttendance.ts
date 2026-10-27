import { ApiError } from "@/lib/api/errors";

export const attendanceLabel = (value: boolean | null) =>
  value === null ? "Sin registrar" : value ? "Asistió" : "No asistió";

export const correctionWindowMessage =
  "Ya pasaron las 48 horas para corregir esta práctica. Solicita la corrección al administrador.";

export function correctionDeadline(scheduledAt: string, durationMinutes: number): number {
  return Date.parse(scheduledAt) + durationMinutes * 60_000 + 48 * 60 * 60_000;
}

export function attendanceReasonError(value: string): string | null {
  const length = [...value.trim()].length;
  return length < 10 || length > 500 ? "El motivo debe tener entre 10 y 500 caracteres." : null;
}

export function attendanceError(cause: unknown): string {
  if (!(cause instanceof ApiError)) return "No se pudo guardar la asistencia. Intenta de nuevo.";
  switch (cause.code) {
    case "ATTENDANCE_WINDOW_CLOSED":
      return correctionWindowMessage;
    case "ATTENDANCE_SAME_VALUE":
      return "La corrección debe cambiar el valor actual. Actualiza la agenda e inténtalo de nuevo.";
    case "PRACTICE_NOT_FOUND":
      return "Franja no encontrada. Puede que ya no te pertenezca; actualiza la agenda.";
    case "PRACTICE_NOT_COMPLETED":
      return "Solo puedes registrar asistencia de una práctica completada.";
    case "ATTENDANCE_ALREADY_REGISTERED":
      return "La asistencia ya fue registrada. Actualiza la agenda y usa la corrección con motivo.";
    case "ATTENDANCE_NOT_REGISTERED":
      return "La asistencia sigue sin registrar. Actualiza la agenda y realiza el registro inicial.";
  }
  if (cause.status === 400) return "Revisa el motivo: debe tener entre 10 y 500 caracteres.";
  if (cause.status === 401) return "Tu sesión terminó. Inicia sesión para continuar.";
  if (cause.status >= 500) return "No se pudo guardar la asistencia. Intenta de nuevo.";
  if (cause.message === "Invalid value") return "Revisa los datos e inténtalo de nuevo.";
  return cause.message;
}
