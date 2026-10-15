import type { StudentEnrollment } from "@/types/student";
import type { StudentCohortOptions } from "@/types/studentCohort";
import { studentProfile } from "./studentProfile";

export const pendingEnrollment: StudentEnrollment = {
  enrollmentId: "22222222-2222-4222-8222-222222222222",
  studentId: studentProfile.id,
  courseId: "33333333-3333-4333-8333-333333333333",
  courseType: "A",
  status: "pendiente_cohorte",
  cohortId: null,
  cohorte: null,
  curso: { id: "33333333-3333-4333-8333-333333333333", nombre: "Curso ficticio", tipo: "A" },
  fechaInscripcion: "2026-01-01",
  montoTotal: null,
  descuento: 0,
  precioBruto: null,
  montoAbonado: 25,
  saldo: null,
  documentosPendientes: 0,
  documentos: [],
};
export const cohortOptions: StudentCohortOptions = {
  enrollmentId: pendingEnrollment.enrollmentId,
  courseId: pendingEnrollment.courseId,
  suggestion: { cohortId: "44444444-4444-4444-8444-444444444444", warning: "matricula_por_cerrar" },
  items: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      nombre: "Cohorte ficticia",
      precio: 100,
      cuposDisponibles: 1,
      fechaInicioMatricula: "2026-10-01",
      fechaFinMatricula: "2026-10-31",
      fechaInicioCurso: "2026-11-01",
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      nombre: "Segunda cohorte ficticia",
      precio: 50,
      cuposDisponibles: 2,
      fechaInicioMatricula: "2026-10-01",
      fechaFinMatricula: "2026-10-31",
      fechaInicioCurso: "2026-11-01",
    },
  ],
};
