import type { DocumentoFisicoEstado } from "@/types/inscripcion";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { etiquetaDocumento } from "@/components/inscripcion/documentosParaLlevar";

export const SCHOOL_ZONE = "America/Guayaquil";
export const isExempt = (document: DocumentoFisicoEstado) =>
  document.exento || document.estado === "exento";
export function documentProgress(documents: DocumentoFisicoEstado[]) {
  const applicable = documents.filter((document) => !isExempt(document));
  const received = applicable.filter((document) => document.estado === "entregado").length;
  return { applicable, received };
}
export function documentName(document: DocumentoFisicoEstado): string {
  if (document.label?.trim()) return document.label;
  const label = etiquetaDocumento(document.tipo);
  return label === document.tipo ? "Documento para entregar" : label;
}
export type DocumentTone = "confirmed" | "pending-review" | "missed" | "cancelled" | "scheduled";
export function documentState(
  document: DocumentoFisicoEstado,
  expired: boolean,
): { label: string; tone: DocumentTone; icon: "check" | "clock" | "minus" } {
  if (isExempt(document)) return { label: "No aplica", tone: "cancelled", icon: "minus" };
  if (document.estado === "entregado")
    return { label: "Entregado", tone: "confirmed", icon: "check" };
  if (document.estado === "pendiente")
    return {
      label: expired ? "Pendiente · plazo vencido" : "Pendiente",
      tone: expired ? "missed" : "pending-review",
      icon: "clock",
    };
  return { label: "Estado por actualizar", tone: "cancelled", icon: "clock" };
}
export function sortedDocuments(documents: DocumentoFisicoEstado[]) {
  const rank = (document: DocumentoFisicoEstado) =>
    isExempt(document) ? 2 : document.estado === "entregado" ? 1 : 0;
  return documents
    .map((document, index) => ({ document, index }))
    .sort((a, b) => rank(a.document) - rank(b.document) || a.index - b.index)
    .map(({ document }) => document);
}
export function dateInstant(value: string): number | null {
  const instant = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-05:00` : value);
  return Number.isFinite(instant) ? instant : null;
}
export function longDate(value: string): string | null {
  const instant = dateInstant(value);
  return instant === null
    ? null
    : new Intl.DateTimeFormat("es-EC", {
        timeZone: SCHOOL_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(instant);
}
export function calendarOrdinal(value: string): number | null {
  const instant = dateInstant(value);
  if (instant === null) return null;
  const parts = new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  // Civil date ordinals, never elapsed 24-hour blocks between timestamps.
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86400000;
}
export const ordinalInstant = (ordinal: number) => ordinal * 86400000 + 17 * 3600000;
export function deadlineInfo(data: StudentEnrollmentState) {
  const date = data.fechaLimite ? longDate(data.fechaLimite) : null;
  const ordinal = data.fechaLimite ? calendarOrdinal(data.fechaLimite) : null;
  // The backend chooses the deadline and counts Guayaquil calendar days.
  const days = date && Number.isInteger(data.diasRestantes) ? data.diasRestantes : null;
  return { date, ordinal, days, expired: days !== null && days < 0 };
}
export function readyStorageKey(enrollmentId: string, type: string): string {
  return `coloradosdrive:documents-ready:v1:${enrollmentId}:${type}`;
}
export const documentTargetId = (type: string) => `student-document-${encodeURIComponent(type)}`;
