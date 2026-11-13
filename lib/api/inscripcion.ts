import { env } from "../utils/env";
import { api } from "./client";
import { ApiError } from "./errors";
import { InscripcionApiError } from "./inscripcionErrors";

import type {
  ConfigInscripcion,
  ConfirmarCodigoInput,
  ConfirmarCodigoResult,
  ConsentimientoInput,
  ConsentimientoResult,
  DatosSolicitudInput,
  DecisionInput,
  DecisionResult,
  DocumentoSubidoResult,
  EnvioSolicitudResult,
  EstadoInscripcion,
  EstadoInscripcionAlumno,
  InscripcionConfig,
  ListaSolicitudes,
  ListarSolicitudesParams,
  MensajeResponse,
  ProgresoSolicitud,
  ReenvioEnlaceResult,
  ResumenSolicitudes,
  SolicitudAdminDetalle,
  SubtipoCertificado,
  TabSolicitudes,
  TokenSolicitudResult,
  UrlCertificado,
  VerificacionInput,
  VerificacionSolicitud,
  VerificarCorreoInput,
} from "@/types/inscripcion";

// ---------------------------------------------------------------------------
// Token de la solicitud: solo en memoria del módulo. Nunca se guarda en URL,
// localStorage, sessionStorage, cookies ni logs; al recargar la página se pierde y
// el postulante vuelve a verificar su correo.
// ---------------------------------------------------------------------------
let tokenSolicitud: string | null = null;

export const sesionSolicitud = {
  tiene: (): boolean => tokenSolicitud !== null,
  guardar: (token: string): void => {
    tokenSolicitud = token;
  },
  limpiar: (): void => {
    tokenSolicitud = null;
  },
};

// ---------------------------------------------------------------------------
// Peticiones públicas (sin sesión de Supabase)
// ---------------------------------------------------------------------------
interface PublicRequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  formData?: FormData;
  conToken?: boolean;
}

async function extraerError(response: Response): Promise<ApiError> {
  try {
    const data: unknown = await response.json();
    if (data !== null && typeof data === "object") {
      const body = data as {
        message?: unknown;
        code?: unknown;
        field?: unknown;
        detalles?: unknown;
      };
      const detalles = body.detalles as { faltantes?: unknown } | null | undefined;
      const faltantes =
        detalles && Array.isArray(detalles.faltantes)
          ? detalles.faltantes.filter((v): v is string => typeof v === "string")
          : undefined;
      return new InscripcionApiError(
        typeof body.message === "string" ? body.message : `Error inesperado (${response.status}).`,
        response.status,
        {
          code: typeof body.code === "string" ? body.code : undefined,
          field: typeof body.field === "string" ? body.field : undefined,
          faltantes,
        },
      );
    }
  } catch {
    // La respuesta no trae un body JSON parseable.
  }
  return new InscripcionApiError(`Error inesperado (${response.status}).`, response.status);
}

async function publicRequest<T>(path: string, options: PublicRequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, conToken = false } = options;
  const headers: Record<string, string> = {};
  if (conToken) {
    if (!tokenSolicitud) {
      throw new InscripcionApiError("Sesión de solicitud ausente.", 401, {
        code: "TOKEN_INVALIDO_O_VENCIDO",
      });
    }
    headers.Authorization = `Bearer ${tokenSolicitud}`;
  }
  // El multipart arma su propio Content-Type con el boundary.
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await extraerError(response);
  }
  return (await response.json()) as T;
}

function rutaSolicitud(id: string, sufijo: string): string {
  return `/solicitudes/${encodeURIComponent(id)}${sufijo}`;
}

// Cuando el servidor renueva el token de edición se reemplaza el que está en memoria.
async function renovarToken(result: TokenSolicitudResult): Promise<TokenSolicitudResult> {
  tokenSolicitud = result.token;
  return result;
}

export const getInscripcionConfig = () =>
  publicRequest<InscripcionConfig>("/public/inscripcion/config");

export const verificarCorreo = (input: VerificarCorreoInput) =>
  publicRequest<MensajeResponse>("/solicitudes/verificar-correo", { method: "POST", body: input });

// Guarda el token en memoria; el llamador solo conserva el id de la solicitud.
export async function confirmarCodigo(
  input: ConfirmarCodigoInput,
): Promise<{ solicitudId: string }> {
  const result = await publicRequest<ConfirmarCodigoResult>("/solicitudes/confirmar-codigo", {
    method: "POST",
    body: input,
  });
  tokenSolicitud = result.token;
  return { solicitudId: result.solicitudId };
}

export const guardarConsentimiento = (id: string, input: ConsentimientoInput) =>
  publicRequest<ConsentimientoResult>(rutaSolicitud(id, "/consentimiento"), {
    method: "PUT",
    body: input,
    conToken: true,
  });

export async function guardarDatos(id: string, input: DatosSolicitudInput) {
  const result = await publicRequest<TokenSolicitudResult>(rutaSolicitud(id, "/datos"), {
    method: "PUT",
    body: input,
    conToken: true,
  });
  return renovarToken(result);
}

// Un solo certificado por solicitud: campos multipart `archivo` y `subtipo`.
export function subirCertificado(
  id: string,
  archivo: Blob,
  nombre: string,
  subtipo: SubtipoCertificado,
) {
  const formData = new FormData();
  formData.append("subtipo", subtipo);
  formData.append("archivo", archivo, nombre);
  return publicRequest<DocumentoSubidoResult>(rutaSolicitud(id, "/documentos"), {
    method: "POST",
    formData,
    conToken: true,
  });
}

export const getProgreso = (id: string) =>
  publicRequest<ProgresoSolicitud>(rutaSolicitud(id, "/progreso"), { conToken: true });

export const enviarSolicitud = (id: string) =>
  publicRequest<EnvioSolicitudResult>(rutaSolicitud(id, "/enviar"), {
    method: "POST",
    conToken: true,
  });

export const reenviarSolicitud = (id: string) =>
  publicRequest<EnvioSolicitudResult>(rutaSolicitud(id, "/reenviar"), {
    method: "POST",
    conToken: true,
  });

// ---------------------------------------------------------------------------
// Admin (JWT de Supabase vía `api`)
// ---------------------------------------------------------------------------
const ESTADO_POR_TAB: Record<TabSolicitudes, EstadoInscripcion | undefined> = {
  pendientes: "enviada",
  devueltas: "devuelta",
  aprobadas: "aprobada",
  archivadas: "archivada",
  rechazadas: "rechazada",
  todas: undefined,
};

export const estadoDeTab = (tab: TabSolicitudes): EstadoInscripcion | undefined =>
  ESTADO_POR_TAB[tab];

export function listarSolicitudes(params: ListarSolicitudesParams = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  if (params.estado) query.set("estado", params.estado);
  const q = params.q?.trim();
  if (q) query.set("q", q);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return api.get<ListaSolicitudes>(`/admin/solicitudes${suffix}`);
}

export const getResumenSolicitudes = () =>
  api.get<ResumenSolicitudes>("/admin/solicitudes/resumen");

export const getSolicitudAdmin = (id: string) =>
  api.get<SolicitudAdminDetalle>(`/admin/solicitudes/${encodeURIComponent(id)}`);

export const registrarVerificacion = (id: string, input: VerificacionInput) =>
  api.post<VerificacionSolicitud>(
    `/admin/solicitudes/${encodeURIComponent(id)}/verificaciones`,
    input,
  );

// Enlace firmado de 300 s, bajo demanda y auditado.
export const getUrlCertificado = (id: string) =>
  api.get<UrlCertificado>(`/admin/solicitudes/${encodeURIComponent(id)}/certificado/url`);

export const decidirSolicitud = (id: string, input: DecisionInput) =>
  api.post<DecisionResult>(`/admin/solicitudes/${encodeURIComponent(id)}/decision`, input);

export const eliminarSolicitud = (id: string) =>
  api.delete<void>(`/admin/solicitudes/${encodeURIComponent(id)}`);

export const getConfigInscripciones = () =>
  api.get<ConfigInscripcion>("/admin/inscripciones/config");

export const setConfigInscripciones = (inscripcionesAbiertas: boolean) =>
  api.put<ConfigInscripcion>("/admin/inscripciones/config", { inscripcionesAbiertas });

export const reenviarEnlaceAcceso = (studentId: string) =>
  api.post<ReenvioEnlaceResult>(
    `/admin/estudiantes/${encodeURIComponent(studentId)}/reenviar-enlace-acceso`,
    {},
  );

// ---------------------------------------------------------------------------
// Alumno e instructor
// ---------------------------------------------------------------------------
export const getEstadoInscripcionAlumno = () =>
  api.get<EstadoInscripcionAlumno>("/estudiantes/estado-inscripcion");
