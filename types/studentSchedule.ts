import type { IndividualEnrollmentSnapshot } from "./enrollmentFoundation";
export interface StudentScheduleInput {
  modalidad: "entre_semana" | "fin_de_semana";
  fechaInicio: string;
  horasPorDia: number;
}
export interface StudentScheduleSelection extends StudentScheduleInput {
  horaInicio: number;
}
export type StartHourReason = "DIA_SIN_INSTRUCTOR" | "SOLAPE_PROPIO" | "SIN_COHORTE_ELEGIBLE";
export interface StudentScheduleNoCohort {
  codigo:
    "SIN_COHORTE_ELEGIBLE" | "SIN_CURSOS_ABIERTOS" | "SIN_FECHAS_COMPATIBLES" | "SIN_HORAS_LIBRES";
  ultimaFechaInicioPosible?: string | null;
  mensaje: string;
  primeraFechaPosible: string | null;
}
export interface StudentScheduleStartOption {
  hora: string;
  factible: boolean;
  motivo: { codigo: StartHourReason; mensaje: string } | null;
  diasFallan: string[];
}
export interface StudentScheduleOptions {
  enrollmentId: string;
  serverNow: string;
  horasRequeridas: number;
  fechaInicioEfectiva: string;
  ajustada: boolean;
  cohorte: { id: string; nombre?: string } | null;
  sinCohorte: StudentScheduleNoCohort | null;
  horas: StudentScheduleStartOption[];
}
export interface StudentSchedulePreviewDay {
  fecha: string;
  inicio: string;
  fin: string;
  horaInicio: string;
  horaFin: string;
  horas: number;
  disponible: boolean;
  motivo: { codigo: "DIA_SIN_INSTRUCTOR" | "SOLAPE_PROPIO"; mensaje: string } | null;
}
export interface StudentSchedulePreview {
  precioCentavos?: number;
  enrollmentId: string;
  serverNow: string;
  modalidad: StudentScheduleInput["modalidad"];
  horasTotales: number;
  horasPorDia: number;
  horaInicio: string;
  fechaInicioSolicitada: string;
  fechaInicioEfectiva: string;
  ajustada: boolean;
  dias: StudentSchedulePreviewDay[];
  ultimaFecha: string;
  ultimaHoraFin: string;
  ultimoFin: string;
  cohorte: { id: string; nombre?: string } | null;
  sinCohorte: StudentScheduleNoCohort | null;
  diasFallan: string[];
  factible: boolean;
}
export interface StudentReservationPlan {
  horaInicio: string;
  horasPorDia: number;
  totalHoras: number;
  dias: { fecha: string; horaInicio: string; horaFin: string; horas: number }[];
  ultimaFecha: string;
  ultimaHoraFin: string;
}
export interface StudentScheduleReservation {
  purpose?: "initial" | "plan_change";
  individualDates?: IndividualEnrollmentSnapshot;
  id: string;
  enrollmentId: string;
  estado: "vigente" | "pago_en_curso" | "liberada" | "vencida" | "confirmada";
  expiraAt: string;
  serverNow: string;
  extensiones: number;
  puedeAmpliar: boolean;
  cohorte?: { id: string; nombre?: string } | null;
  precioCentavos?: number;
  franjas: { scheduledAt: string }[];
  plan?: StudentReservationPlan | null;
}
export interface StudentReservationSnapshot {
  reserva: StudentScheduleReservation | null;
  serverNow: string;
}

export interface StudentPlanRules {
  endHour?: number;
  active: boolean;
  serverNow: string;
  options: {
    modalidad: StudentScheduleInput["modalidad"];
    horasPorDia: number;
    habilitada: boolean;
    totalHoras?: number;
    sesiones: number;
    primeraFecha: string;
    ultimaFecha: string;
  }[];
}
