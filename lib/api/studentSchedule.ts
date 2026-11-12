import { api } from "./client";
import { ApiError } from "./errors";
import type {
  StudentPlanRules,
  StudentScheduleInput,
  StudentScheduleOptions,
  StudentSchedulePreview,
  StudentScheduleSelection,
  StudentScheduleReservation,
  StudentReservationSnapshot,
} from "@/types/studentSchedule";
const ROOT = "/estudiantes/inscripcion";
const options = () => ({ signal: AbortSignal.timeout(15_000), cache: "no-store" as const });
export const studentScheduleApi = {
  rules: (signal: AbortSignal) =>
    api.get<StudentPlanRules>(`${ROOT}/horario/config`, { signal, cache: "no-store" }),
  calendar: (enrollmentId: string, input: StudentScheduleInput, signal: AbortSignal) =>
    api.post<{ serverNow: string; dias: { fecha: string; disponible: boolean }[] }>(
      `${ROOT}/horario/calendario`,
      { enrollmentId, ...input },
      { signal, cache: "no-store" },
    ),
  options: (enrollmentId: string, input: StudentScheduleInput, signal: AbortSignal) =>
    api.post<StudentScheduleOptions>(
      `${ROOT}/horario/opciones`,
      { enrollmentId, ...input },
      { signal, cache: "no-store" },
    ),
  preview: (enrollmentId: string, input: StudentScheduleSelection, signal: AbortSignal) =>
    api.post<StudentSchedulePreview>(
      `${ROOT}/horario/plan`,
      { enrollmentId, ...input },
      { signal, cache: "no-store" },
    ),
  reserve: (enrollmentId: string, input: StudentScheduleSelection) =>
    api.post<StudentScheduleReservation>(`${ROOT}/reservas`, { enrollmentId, ...input }, options()),
  current: (enrollmentId?: string) =>
    api.get<StudentReservationSnapshot>(
      enrollmentId
        ? `${ROOT}/reserva/matricula/${encodeURIComponent(enrollmentId)}`
        : `${ROOT}/reserva`,
      options(),
    ),
  change: (id: string, action: "ampliar" | "liberar") =>
    api.post<StudentReservationSnapshot>(
      `${ROOT}/reservas/${encodeURIComponent(id)}/${action}`,
      {},
      options(),
    ),
};
const messages: Record<string, string> = {
  HORARIO_NO_DISPONIBLE: "Ese horario ya no está libre. Elige otra hora de inicio.",
  PLAN_NO_FACTIBLE: "Ese horario ya no es posible en todos los días. Elige otra hora de inicio.",
  HORA_INICIO_INVALIDA: "Elige una hora de inicio que permita terminar a las 22:00.",
  FECHA_INICIO_INVALIDA: "Elige una fecha de inicio desde mañana y dentro del próximo año.",
  RESERVA_CONCURRENTE: "El horario se está actualizando. Consulta su estado antes de reintentar.",
  RESERVA_YA_EXISTE: "Ya tienes una reserva. Consulta su estado antes de elegir otra.",
  LIMITE_RESERVAS_DIARIO: "Alcanzaste el máximo de reservas de hoy. Puedes volver mañana.",
  RESERVA_NO_AMPLIABLE: "Esta reserva ya no se puede ampliar.",
  PAGO_EN_CURSO: "Espera el resultado del pago antes de cambiar tu reserva.",
  SIN_COHORTE_ELEGIBLE: "Ningún grupo con cupo cubre todas esas fechas. Prueba otro inicio.",
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
