import { api } from "./client";
import { ApiError } from "./errors";
import type {
  StudentScheduleInput,
  StudentScheduleAvailability,
  StudentScheduleReservation,
  StudentReservationSnapshot,
} from "@/types/studentSchedule";
const ROOT = "/estudiantes/inscripcion";
const options = () => ({ signal: AbortSignal.timeout(15_000), cache: "no-store" as const });
export const studentScheduleApi = {
  availability: (enrollmentId: string, input: StudentScheduleInput, signal: AbortSignal) =>
    api.post<StudentScheduleAvailability>(
      `${ROOT}/disponibilidad`,
      { enrollmentId, ...input },
      { signal, cache: "no-store" },
    ),
  reserve: (
    enrollmentId: string,
    input: StudentScheduleInput,
    franjas: { fecha: string; hora: string }[],
  ) =>
    api.post<StudentScheduleReservation>(
      `${ROOT}/reservas`,
      { enrollmentId, ...input, franjas },
      options(),
    ),
  current: () => api.get<StudentReservationSnapshot>(`${ROOT}/reserva`, options()),
  change: (id: string, action: "ampliar" | "liberar") =>
    api.post<StudentReservationSnapshot>(
      `${ROOT}/reservas/${encodeURIComponent(id)}/${action}`,
      {},
      options(),
    ),
};
const messages: Record<string, string> = {
  HORARIO_NO_DISPONIBLE: "Una franja ya se ocupó. Consulta nuevamente y elige tu horario.",
  RESERVA_CONCURRENTE: "El horario se está actualizando. Consulta su estado antes de reintentar.",
  RESERVA_YA_EXISTE: "Ya tienes una reserva. Consulta su estado antes de elegir otra.",
  LIMITE_RESERVAS_DIARIO: "Alcanzaste el máximo de reservas de hoy. Puedes volver mañana.",
  RESERVA_NO_AMPLIABLE: "Esta reserva ya no se puede ampliar.",
  PAGO_EN_CURSO: "Espera el resultado del pago antes de cambiar tu reserva.",
  SIN_COHORTE_ELEGIBLE: "Ninguna cohorte con cupo contiene todas esas fechas. Prueba otro inicio.",
  RESERVA_NO_PERMITIDA:
    "No puedes reservar con el estado actual de tu inscripción. Recarga la página.",
  LIMITE_PETICIONES: "Has consultado demasiadas veces. Espera unos minutos antes de reintentar.",
};
export function scheduleError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Tu sesión venció. Inicia sesión nuevamente.";
    return (error.code && messages[error.code]) || error.message;
  }
  return "No se pudo confirmar la respuesta del servidor. Consulta tu reserva antes de reintentar.";
}
