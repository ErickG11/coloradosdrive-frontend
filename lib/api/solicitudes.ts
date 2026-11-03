import { api } from "./client";
import { ApiError } from "./errors";
import { env } from "@/lib/utils/env";
import type { PublicCourse } from "@/types/publicCourse";
import type {
  DocumentoResult,
  DocumentoTipo,
  PrivacyNotice,
  SolicitudDatos,
  SolicitudDecision,
  SolicitudPage,
  SolicitudProgress,
  SolicitudSession,
} from "@/types/solicitud";
const path = (s: SolicitudSession) => `/solicitudes/${s.solicitudId}`;
export const solicitudes = {
  submit: (s: SolicitudSession) =>
    api.post<{ id: string; estado: string; enviadaAt: string }>(
      `${path(s)}/enviar`,
      {},
      { token: s.token },
    ),
  summary: () =>
    api.get<{ pendientes: number; documentosPorRevisar: number }>("/admin/solicitudes/resumen"),
  courses: () => api.get<PublicCourse[]>("/public/courses", { token: null }),
  notice: () => api.get<PrivacyNotice>("/public/aviso-privacidad", { token: null }),
  sendCode: (correo: string, courseId: string) =>
    api.post<{ message: string }>(
      "/solicitudes/verificar-correo",
      { correo, courseId },
      { token: null },
    ),
  confirmCode: (correo: string, codigo: string) =>
    api.post<SolicitudSession>(
      "/solicitudes/confirmar-codigo",
      { correo, codigo },
      { token: null },
    ),
  progress: (s: SolicitudSession) =>
    api.get<SolicitudProgress>(`${path(s)}/progreso`, { token: s.token }),
  consent: (s: SolicitudSession, versionAviso: string) =>
    api.put<{ version: string }>(
      `${path(s)}/consentimiento`,
      { versionAviso, aceptoTratamiento: true, declaraVeracidad: true },
      { token: s.token },
    ),
  saveData: (s: SolicitudSession, data: SolicitudDatos) =>
    api.put<SolicitudSession>(`${path(s)}/datos`, data, { token: s.token }),
  list: (query: URLSearchParams) => api.get<SolicitudPage>(`/admin/solicitudes?${query}`),
  documentUrl: (id: string, doc: string) =>
    api.get<{ url: string; expiresIn: number }>(`/admin/solicitudes/${id}/documentos/${doc}/url`),
  reviewDocument: (
    id: string,
    doc: string,
    estado: "aprobado" | "rechazado",
    motivoRechazo?: string,
  ) => api.patch(`/admin/solicitudes/${id}/documentos/${doc}`, { estado, motivoRechazo }),
  decide: (id: string, estado: "aprobada" | "rechazada", motivoRechazo?: string) =>
    api.patch<SolicitudDecision>(`/admin/solicitudes/${id}`, { estado, motivoRechazo }),
  remove: (id: string) => api.delete<void>(`/admin/solicitudes/${id}`),
};
export async function uploadSolicitudDocument(
  s: SolicitudSession,
  tipo: DocumentoTipo,
  file: File,
): Promise<DocumentoResult> {
  const body = new FormData();
  body.append("tipo_documento", tipo);
  body.append("archivo", file);
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path(s)}/documentos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.token}` },
    body,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(data.message ?? "No se pudo subir el documento", response.status, {
      code: data.code,
    });
  }
  return response.json() as Promise<DocumentoResult>;
}
const MESSAGES: Record<string, string> = {
  SOLICITUD_ENVIADA: "Tu solicitud ya fue enviada. Sus datos no se pueden modificar.",
  CEDULA_YA_REGISTRADA: "La cédula ya está registrada. Revisa el número o contacta a la escuela.",
  DOCUMENTO_YA_APROBADO: "Este documento ya fue aprobado y no se puede reemplazar.",
  EXPEDIENTE_NO_DISPONIBLE: "No hay una solicitud vinculada a tu cuenta. Contacta a la escuela.",
  DOCUMENTO_YA_REVISADO: "Este documento ya fue revisado. Actualizamos el estado de la solicitud.",
  SOLICITUD_CERRADA:
    "La solicitud está cerrada o en revisión por otro administrador. Actualizamos su estado.",
  CODIGO_INVALIDO_O_VENCIDO: "El código es incorrecto o venció. Revísalo o solicita uno nuevo.",
  INTENTOS_AGOTADOS: "Alcanzaste el límite de intentos. Solicita un nuevo código.",
  LIMITE_PETICIONES:
    "Has realizado varios intentos. Espera unos minutos antes de volver a intentarlo.",
  CORREO_YA_APROBADO:
    "Este correo ya tiene una solicitud aprobada. Inicia sesión o contacta a la escuela.",
  CURSO_NO_ENCONTRADO: "El curso no está disponible. Selecciona otro curso.",
  TOKEN_INVALIDO_O_VENCIDO: "Tu verificación venció. Recarga y verifica tu correo para continuar.",
  AVISO_DESACTUALIZADO: "El aviso cambió. Recarga para revisar la versión vigente.",
};
export function solicitudMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code ?? ""] ?? error.message;
  return "No pudimos conectarnos. Revisa tu conexión e intenta nuevamente.";
}
