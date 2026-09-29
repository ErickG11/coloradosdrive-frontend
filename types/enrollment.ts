import type { User } from "./user";

export type EnrollmentStatus = "activo" | "finalizado" | "retirado" | "pendiente_cohorte";

// Refleja la tabla `enrollments` del backend: vínculo estudiante-cohorte.
// Un estudiante solo puede estar "activo" o "pendiente_cohorte" (inscrito
// pero sin cohorte asignada todavía, porque ninguna cohorte del curso
// tenía matrícula abierta) en una cohorte a la vez — restricción aplicada
// en la base de datos, no aquí. cohortId/montoTotal son null exactamente
// cuando status es 'pendiente_cohorte'.
export interface Enrollment {
  id: string;
  studentId: string;
  cohortId: string | null;
  status: EnrollmentStatus;
  montoTotal: number | null;
  fechaInscripcion: string;
  createdAt: string;
  updatedAt: string;
}

// Payload de POST /enrollments (matrícula manual del admin). cohortId es
// opcional: si no se manda, el backend asigna automáticamente contra las
// cohortes de courseId (Fase 10) — en ese caso courseId es obligatorio.
export interface CreateEnrollmentInput {
  cedula: string;
  nombreCompleto: string;
  correo: string;
  telefono?: string;
  cohortId?: string;
  courseId?: string;
}

export interface EnrollStudentResult {
  student: User;
  enrollment: Enrollment;
}
