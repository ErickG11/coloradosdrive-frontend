import type {
  CourseType,
  Enrollment,
  InstructorSugerido,
  Modalidad,
  SugerirPracticaResult,
} from "@/types";

export const WIZARD_STEPS = [1, 2, 3, 4] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface StudentData {
  cedula: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
}

export const EMPTY_STUDENT: StudentData = {
  cedula: "",
  nombreCompleto: "",
  correo: "",
  telefono: "",
};

// courseId/courseTipo/courseNombre se fijan al elegir el tipo de curso en
// el paso 2; cohortId es la sugerencia de CohortAssignmentService o la
// cohorte que el admin eligió a mano ("cambiar cohorte"); null cuando
// ninguna cohorte tiene matrícula abierta hoy (se asignará después).
export interface CourseSelection {
  courseId: string;
  courseTipo: CourseType;
  courseNombre: string;
  cohortId: string | null;
  manualOverride: boolean;
}

export type PracticeEndMode = "numeroSesiones" | "fechaFin";

export interface PracticeFormData {
  modalidad: Modalidad;
  horasPorDia: number;
  fechaInicio: string;
  horaDeseada: string;
  endMode: PracticeEndMode;
  numeroSesiones: number;
  fechaFin: string;
}

export const EMPTY_PRACTICE: PracticeFormData = {
  modalidad: "entre_semana",
  horasPorDia: 2,
  fechaInicio: "",
  horaDeseada: "08:00",
  endMode: "numeroSesiones",
  numeroSesiones: 20,
  fechaFin: "",
};

export interface PracticeChoice {
  form: PracticeFormData;
  suggestion: SugerirPracticaResult;
  instructor: InstructorSugerido;
}

export interface WizardState {
  step: WizardStep;
  student: StudentData;
  course: CourseSelection | null;
  enrollment: Enrollment | null;
  practice: PracticeChoice | null;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  student: EMPTY_STUDENT,
  course: null,
  enrollment: null,
  practice: null,
};
