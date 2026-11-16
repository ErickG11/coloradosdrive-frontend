// RF-08 · Contrato de reportes con el backend (GET /admin/reportes y
// GET /admin/reportes/exportar). Ver coloradosdrive-backend
// src/models/report.model.ts y docs/operations/reportes-exportacion.md.

export const REPORT_TYPES = [
  "matriculas",
  "asistencia",
  "examenes",
  "finanzas",
  "instructores",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportSelection = ReportType | "todos";
export type ReportFormat = "pdf" | "xlsx";
export type ReportCourseFilter = "A" | "B" | "todos";

/** Filtros tal como se muestran en pantalla y se envían al servidor. */
export interface ReportFilters {
  /** Fecha civil AAAA-MM-DD (hora de Ecuador), inclusiva. */
  desde: string;
  /** Fecha civil AAAA-MM-DD (hora de Ecuador), inclusiva. */
  hasta: string;
  tipoCurso: ReportCourseFilter;
  /** Cadena vacía = todas las cohortes. */
  cohorteId: string;
  tipo: ReportSelection;
}

export type ReportCellKind = "text" | "integer" | "decimal" | "money" | "percent";
export type ReportCell = string | number | null;

export interface ReportTable {
  type: ReportType;
  title: string;
  sheetName: string;
  description: string;
  columns: { key: string; label: string; kind: ReportCellKind }[];
  rows: Record<string, ReportCell>[];
  totals: Record<string, ReportCell> | null;
  /** `money` llega en centavos enteros; `percent`, como proporción 0–1 (null = «—»). */
  indicators: { label: string; kind: ReportCellKind; value: ReportCell }[];
  notes: string[];
  chart: { title: string; kind: ReportCellKind; items: { label: string; value: number }[] } | null;
  rowCount: number;
}

export interface ReportDocument {
  meta: {
    school: string;
    title: string;
    generatedAt: string;
    timezone: string;
    generatedBy: { name: string; role: string };
    filterSummary: { label: string; value: string }[];
    demoMode: boolean;
    omitted: { type: ReportType; reason: string }[];
  };
  reports: ReportTable[];
}
