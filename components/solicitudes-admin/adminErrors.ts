import { ApiError } from "@/lib/api/errors";
import { inscripcionErrorMessage } from "@/lib/api/inscripcionErrors";

// Mensajes para el personal de la escuela. Los códigos que el mapa del postulante redacta en
// segunda persona ("tu solicitud") se reescriben aquí; el resto reutiliza el mapa común.
const MENSAJES_ADMIN: Record<string, string> = {
  ESTADO_INCORRECTO:
    "La solicitud ya no está en un estado que permita esta acción. Recarga el detalle.",
  SOLICITUD_CERRADA: "La solicitud ya fue decidida y no admite cambios.",
  CONFLICTO_SOLICITUD:
    "La solicitud cambió mientras la revisabas. Recarga el detalle e inténtalo de nuevo.",
  NO_ENCONTRADO: "No se encontró la solicitud. Puede haber sido eliminada o purgada.",
  ACCESO_DENEGADO: "No tienes permiso para realizar esta acción.",
  MFA_REQUERIDA: "Activa la verificación en dos pasos para usar este panel.",
  METODO_INVALIDO: "Ese método no es válido para este tipo de verificación.",
  VERIFICACION_INSUFICIENTE:
    "Faltan verificaciones válidas de identidad y estudios para aprobar. Regístralas primero.",
  VERIFICACIONES_INSUFICIENTES:
    "Faltan verificaciones válidas de identidad y estudios para aprobar. Regístralas primero.",
  VERIFICACION_DESACTUALIZADA:
    "Los datos cambiaron después de la verificación. Vuelve a verificar antes de aprobar.",
  DOCUMENTO_REQUERIDO: "Falta el certificado de estudios obligatorio. Devuelve la solicitud.",
  DOCUMENTO_PENDIENTE_POR_CUPO:
    "El certificado quedó pendiente por el tope diario. Devuelve la solicitud con «Requiere documento de estudios».",
  CONSENTIMIENTO_REQUERIDO: "La solicitud no tiene un consentimiento vigente.",
  DATOS_INCOMPLETOS: "La solicitud tiene datos incompletos y no se puede aprobar.",
  MOTIVO_REQUERIDO: "Selecciona un motivo para esta decisión.",
  MOTIVO_INVALIDO: "Selecciona un motivo válido para esta acción.",
  MENSAJE_REQUERIDO: "Escribe el mensaje para el postulante (de 10 a 300 caracteres).",
  ARCHIVO_NO_DISPONIBLE: "El certificado ya no está disponible.",
};

export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code && error.code in MENSAJES_ADMIN)
    return MENSAJES_ADMIN[error.code];
  return inscripcionErrorMessage(error);
}

// El servidor decidió otra cosa mientras el admin revisaba: conviene recargar el detalle.
export function esConflictoDeEstado(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 409 ||
      ["ESTADO_INCORRECTO", "SOLICITUD_CERRADA", "CONFLICTO_SOLICITUD"].includes(error.code ?? ""))
  );
}
