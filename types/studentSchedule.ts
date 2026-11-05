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
  codigo: "SIN_COHORTE_ELEGIBLE";
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
  cohorte: { id: string; nombre: string } | null;
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
  cohorte: { id: string; nombre: string } | null;
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
  id: string;
  enrollmentId: string;
  estado: "vigente" | "pago_en_curso" | "liberada" | "vencida" | "confirmada";
  expiraAt: string;
  serverNow: string;
  extensiones: number;
  puedeAmpliar: boolean;
  cohorte: { id: string; nombre: string };
  franjas: { scheduledAt: string }[];
  plan?: StudentReservationPlan | null;
}
export interface StudentReservationSnapshot {
  reserva: StudentScheduleReservation | null;
  serverNow: string;
}
