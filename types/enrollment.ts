export type EnrollmentStatus = "activo" | "finalizado" | "retirado";

// Refleja la tabla `enrollments` del backend: vínculo estudiante-cohorte.
// Un estudiante solo puede estar "activo" en una cohorte a la vez
// (restricción aplicada en la base de datos, no aquí).
export interface Enrollment {
  id: string;
  studentId: string;
  cohortId: string;
  status: EnrollmentStatus;
  fechaInscripcion: string;
  createdAt: string;
  updatedAt: string;
}
