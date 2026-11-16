import { env } from "../utils/env";
import { getAccessToken, redirigirAlDesafioMfa } from "./client";
import { ApiError } from "./errors";
import type { ReportFilters, ReportFormat, ReportSelection } from "@/types/report";

// RF-08 · Exportación de reportes (CD-346). La descarga es autenticada: se pide
// con fetch + Authorization, se recibe como blob y se guarda con el nombre que
// envía el servidor en Content-Disposition.

export const REPORT_MAX_RANGE_DAYS = 366;
export const REPORT_MIN_DATE = "2000-01-01";

export const REPORT_TYPE_LABELS: Record<ReportSelection, string> = {
  todos: "Todos los reportes",
  matriculas: "Matrículas por cohorte",
  asistencia: "Asistencia a prácticas",
  examenes: "Aprobación de exámenes",
  finanzas: "Finanzas",
  instructores: "Ranking de instructores",
};
export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = { pdf: "PDF", xlsx: "Excel" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dayNumber = (value: string): number => Date.parse(`${value}T12:00:00Z`) / 86_400_000;

export type ReportFilterErrors = Partial<Record<"desde" | "hasta", string>>;

/** Validación en el cliente; el servidor vuelve a validar todo. */
export function validateReportFilters(filters: ReportFilters): ReportFilterErrors {
  const errors: ReportFilterErrors = {};
  if (!filters.desde) errors.desde = "Indica la fecha inicial.";
  else if (!validDate(filters.desde)) errors.desde = "La fecha inicial no es válida.";
  else if (filters.desde < REPORT_MIN_DATE)
    errors.desde = "La fecha inicial no puede ser anterior al año 2000.";
  if (!filters.hasta) errors.hasta = "Indica la fecha final.";
  else if (!validDate(filters.hasta)) errors.hasta = "La fecha final no es válida.";
  if (errors.desde || errors.hasta) return errors;
  if (filters.desde > filters.hasta)
    errors.desde = "La fecha inicial no puede ser posterior a la fecha final.";
  else if (dayNumber(filters.hasta) - dayNumber(filters.desde) + 1 > REPORT_MAX_RANGE_DAYS)
    errors.hasta = `El período no puede superar ${REPORT_MAX_RANGE_DAYS} días.`;
  return errors;
}

/** Parámetros enviados: exactamente los filtros activos, sin valores vacíos. */
export function reportQuery(filters: ReportFilters, formato?: ReportFormat): URLSearchParams {
  const query = new URLSearchParams({
    desde: filters.desde,
    hasta: filters.hasta,
    tipoCurso: filters.tipoCurso,
    tipo: filters.tipo,
  });
  if (filters.cohorteId) query.set("cohorteId", filters.cohorteId);
  if (formato) query.set("formato", formato);
  return query;
}

const civil = (value: string): string =>
  validDate(value) ? value.split("-").reverse().join("/") : "—";

/** Resumen legible de los filtros que se enviarán. */
export function reportFilterSummary(
  filters: ReportFilters,
  cohortName?: string | null,
): { label: string; value: string }[] {
  return [
    { label: "Período", value: `${civil(filters.desde)} al ${civil(filters.hasta)}` },
    {
      label: "Tipo de curso",
      value: filters.tipoCurso === "todos" ? "Todos" : `Tipo ${filters.tipoCurso}`,
    },
    { label: "Cohorte", value: filters.cohorteId ? (cohortName ?? "Seleccionada") : "Todas" },
    { label: "Reporte", value: REPORT_TYPE_LABELS[filters.tipo] },
  ];
}

export function fallbackReportFileName(filters: ReportFilters, formato: ReportFormat): string {
  return `reporte-${filters.tipo}-${filters.desde}_${filters.hasta}.${formato}`;
}

/** Nombre de Content-Disposition; solo se acepta si es un nombre de archivo simple. */
export function fileNameFromDisposition(header: string | null): string | null {
  const match = header ? /filename="?([^";]+)"?/i.exec(header) : null;
  const name = match?.[1]?.trim();
  return name && /^[A-Za-z0-9._-]{1,120}$/.test(name) && !name.startsWith(".") ? name : null;
}

const FIELD_NAMES = new Set(["desde", "hasta", "tipoCurso", "cohorteId", "tipo", "formato"]);

/** Mensaje en español para cada error de la exportación. */
export function reportErrorMessage(status: number, code?: string, serverMessage?: string): string {
  if (status === 400)
    return serverMessage ?? "Revisa los filtros del reporte e inténtalo de nuevo.";
  if (status === 401) return "Tu sesión expiró. Inicia sesión de nuevo para exportar.";
  if (status === 403) {
    if (code === "MFA_REQUERIDA") return "Verifica tu segundo factor para exportar reportes.";
    if (code === "PERMISO_REQUERIDO")
      return "No tienes permiso para exportar reportes financieros.";
    return "Solo el administrador puede exportar reportes.";
  }
  if (status === 413)
    return "El reporte es demasiado grande. Acota el rango de fechas o elige una cohorte.";
  if (status === 429)
    return code === "EXPORTACION_OCUPADA"
      ? "Hay otras exportaciones en curso. Espera unos segundos e inténtalo de nuevo."
      : "Hiciste demasiadas exportaciones. Espera unos minutos e inténtalo de nuevo.";
  if (status >= 500) return "No pudimos generar el reporte. Inténtalo de nuevo en unos minutos.";
  return "No se pudo exportar el reporte. Inténtalo de nuevo.";
}

export interface DownloadedReport {
  blob: Blob;
  fileName: string;
}

export async function downloadReport(
  filters: ReportFilters,
  formato: ReportFormat,
  signal?: AbortSignal,
): Promise<DownloadedReport> {
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/admin/reportes/exportar?${reportQuery(filters, formato).toString()}`,
      {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }
  if (!response.ok) {
    let body: { message?: unknown; code?: unknown; field?: unknown } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // La respuesta de error no trae JSON: se usa el mensaje por código HTTP.
    }
    const code = typeof body.code === "string" ? body.code : undefined;
    const field =
      typeof body.field === "string" && FIELD_NAMES.has(body.field) ? body.field : undefined;
    if (response.status === 403 && code === "MFA_REQUERIDA") redirigirAlDesafioMfa();
    throw new ApiError(
      reportErrorMessage(
        response.status,
        code,
        typeof body.message === "string" ? body.message : undefined,
      ),
      response.status,
      { code, field },
    );
  }
  const blob = await response.blob();
  if (blob.size === 0)
    throw new ApiError("El servidor devolvió un archivo vacío. Inténtalo de nuevo.", 502);
  return {
    blob,
    fileName:
      fileNameFromDisposition(response.headers.get("Content-Disposition")) ??
      fallbackReportFileName(filters, formato),
  };
}

/**
 * Inicia la descarga en el navegador y devuelve la URL del blob para ofrecer
 * un enlace alternativo (Safari de iOS y algunos navegadores de Android pueden
 * ignorar la descarga automática). Quien llama debe revocar la URL.
 */
export function saveReport(file: DownloadedReport): string {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return url;
}
