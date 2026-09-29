export const MODALIDADES = ["entre_semana", "fin_de_semana"] as const;

export type Modalidad = (typeof MODALIDADES)[number];

// Parámetros base compartidos por sugerir-practica y confirmar-practica:
// exactamente uno de fechaFin/numeroSesiones debe ir presente.
export interface GenerarPracticaBaseInput {
  fechaInicio: string;
  modalidad: Modalidad;
  horasPorDia: number;
  fechaFin?: string;
  numeroSesiones?: number;
}

export interface SugerirPracticaInput extends GenerarPracticaBaseInput {
  horaDeseada: string;
}

export interface InstructorSugerido {
  id: string;
  nombreCompleto: string;
}

// Refleja la respuesta de POST /admin/enrollments/:enrollmentId/sugerir-practica.
export interface SugerirPracticaResult {
  fechas: string[];
  horaDeseada: string;
  horaResuelta: string;
  horaAjustada: boolean;
  instructoresSugeridos: InstructorSugerido[];
  totalSesiones: number;
  horasProgramadas: number;
  horasRequeridas: number | null;
}

export interface ConfirmarPracticaInput extends GenerarPracticaBaseInput {
  horaResuelta: string;
  instructorId: string;
}

// Refleja la respuesta de POST /admin/enrollments/:enrollmentId/confirmar-practica.
export interface ConfirmarPracticaResult {
  slotsCreados: number;
  horasProgramadas: number;
  horasRequeridas: number | null;
  slotIds: string[];
}
