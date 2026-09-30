import type { CourseType, InstructorSugerido, Modalidad, SugerirPracticaResult } from "@/types";
export const BASE = "/admin/manual-enrollments";
export const WIZARD_STEPS = [1, 2, 3, 4] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
export interface StudentData {
  mode: "new" | "existing";
  id?: string;
  cedula: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  vigentes?: { tipo: CourseType; status: string }[];
}
export const EMPTY_STUDENT: StudentData = {
  mode: "new",
  cedula: "",
  nombreCompleto: "",
  correo: "",
  telefono: "",
};
export interface CatalogEntry {
  tipo: CourseType;
  nombre: string;
  courseId: string | null;
}
export interface PreviewCohort {
  id: string;
  course_id: string;
  nombre: string;
  precio: string;
  cupo_maximo: number;
  ocupados: number;
  fecha_inicio_matricula: string;
  fecha_fin_matricula: string;
  fecha_inicio_curso: string;
  fecha_fin_curso: string;
}
export interface CourseSelection {
  courseId: string;
  courseTipo: CourseType;
  courseNombre: string;
  cohortId: string | null;
  manualOverride: boolean;
  cohort?: PreviewCohort;
}
export interface CoursePreview {
  courseId: string;
  tipo: CourseType;
  suggestion: {
    cohortId: string | null;
    warning: string | null;
    precio: number | null;
    cohortNombre: string | null;
  };
  cohorts: PreviewCohort[];
}
export interface PracticeFormData {
  semanas: 1 | 2 | 3;
  modalidad: Modalidad;
  horasPorDia: number;
  fechaInicio: string;
  horaDeseada: string;
  fechaFin: string;
  manual: boolean;
}
export const EMPTY_PRACTICE: PracticeFormData = {
  semanas: 1,
  modalidad: "entre_semana",
  horasPorDia: 2,
  fechaInicio: "",
  horaDeseada: "08:00",
  fechaFin: "",
  manual: false,
};
export interface PracticePlan {
  timezone: string;
  semanas: number;
  modalidad: Modalidad;
  fechaInicio: string;
  primerDiaEfectivo: string;
  fechaFin: string;
  fechaFinElegida: string;
  manual: boolean;
  fechas: string[];
  dias: number;
  bloques: number;
  horas: number;
}
export interface PracticeChoice {
  form: PracticeFormData;
  plan: PracticePlan;
  suggestion: SugerirPracticaResult | null;
  instructor: InstructorSugerido | null;
}
export interface ManualResult {
  operationId: string;
  studentId: string;
  studentCreated: boolean;
  enrollmentId: string;
  courseId: string;
  courseType: CourseType;
  cohortId: string | null;
  status: "activo" | "pendiente_cohorte";
  slotsCreated: number;
  emailStatus: "sent" | "failed" | "pending" | "sending";
  plan: PracticePlan;
}
export function practicePayload(form: PracticeFormData) {
  return {
    semanas: form.semanas,
    modalidad: form.modalidad,
    horasPorDia: form.horasPorDia,
    fechaInicio: form.fechaInicio,
    horaDeseada: form.horaDeseada,
    ...(form.manual ? { fechaFin: form.fechaFin } : {}),
  };
}
