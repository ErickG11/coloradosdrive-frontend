import { api } from "./client";
import { ApiError } from "./errors";
import type {
  StudentPayment,
  PaymentConfiguration,
  PaymentQuote,
  AdminPaymentData,
} from "@/types/studentPayment";
const ROOT = "/estudiantes/inscripcion/pagos";
const options = () => ({ signal: AbortSignal.timeout(45_000), cache: "no-store" as const });
export const studentPaymentApi = {
  config: () => api.get<PaymentConfiguration>(`${ROOT}/config`, options()),
  current: (enrollmentId: string) =>
    api.get<{ pago: StudentPayment | null }>(
      `${ROOT}/matricula/${encodeURIComponent(enrollmentId)}/actual`,
      options(),
    ),
  quote: (id: string) =>
    api.get<PaymentQuote>(`${ROOT}/reserva/${encodeURIComponent(id)}/cotizacion`, options()),
  begin: (reservationId: string, attemptKey: string) =>
    api.post<StudentPayment>(ROOT, { reservationId, attemptKey }, options()),
  get: (id: string) => api.get<StudentPayment>(`${ROOT}/${encodeURIComponent(id)}`, options()),
  simulate: (id: string, resultado: "aprobado" | "rechazado" | "pendiente") =>
    api.post<StudentPayment>(`${ROOT}/${encodeURIComponent(id)}/simular`, { resultado }, options()),
  charge: (id: string, token: string) =>
    api.post<StudentPayment>(`${ROOT}/${encodeURIComponent(id)}/cobrar`, { token }, options()),
};
export const adminPaymentApi = {
  get: (studentId: string) =>
    api.get<AdminPaymentData>(`/admin/pagos/alumnos/${encodeURIComponent(studentId)}`, options()),
  cash: (studentId: string, reservationId: string, attemptKey: string, comprobante: string) =>
    api.post<StudentPayment>(
      "/admin/pagos/efectivo",
      { studentId, reservationId, attemptKey, ...(comprobante ? { comprobante } : {}) },
      options(),
    ),
  release: (id: string) =>
    api.post<void>(`/admin/pagos/reservas/${encodeURIComponent(id)}/liberar`, {}, options()),
};
const messages: Record<string, string> = {
  PAGO_PENDIENTE: "Ya hay un pago pendiente o recibido. Consulta su estado; no pagues otra vez.",
  RESERVA_VENCIDA: "Tu reserva venció. Elige tu horario nuevamente.",
  PAGO_CONFLICTO: "El intento cambió. Consulta el pago antes de reintentar.",
  PAGO_CONCURRENTE: "El pago se está actualizando. Consulta su estado antes de reintentar.",
  PAGO_EN_ESCUELA: "La escuela registrará tu pago en efectivo.",
  PAGO_MONTO_DISTINTO: "El importe no coincide. Contacta a la escuela antes de pagar de nuevo.",
  SIMULACION_DESHABILITADA: "El checkout simulado no está disponible.",
  LIMITE_PETICIONES: "Demasiadas solicitudes. Espera unos minutos antes de reintentar.",
};
export function paymentError(error: unknown): string {
  if (error instanceof ApiError) return (error.code && messages[error.code]) || error.message;
  return "No pudimos confirmar la respuesta. Consulta el estado antes de reintentar el pago.";
}
export function paymentMoney(cents: number): string {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100);
}
