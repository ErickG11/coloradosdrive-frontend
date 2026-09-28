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
