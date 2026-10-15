import type { ManualEnrollmentDetails } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import type { EnrollmentStatus } from "./enrollment";
import type { CourseType } from "./course";

export interface MatchingEnrollment {
  id: string;
  courseId: string;
  courseType: CourseType;
  cohortId: string | null;
  status: EnrollmentStatus;
}
export interface AdminStudent {
  id: string;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
  matchingEnrollments: MatchingEnrollment[];
}
export interface StudentList {
  items: AdminStudent[];
  total: number;
  page: number;
  pageSize: number;
}
export interface StudentEnrollment extends ManualEnrollmentDetails {
  status: EnrollmentStatus;
  courseId: string;
  courseType: CourseType;
  fechaInscripcion: string;
  curso: { id: string; nombre: string; tipo: CourseType } | null;
  cohorte: {
    id: string;
    nombre: string;
    fecha_inicio_curso: string;
    fecha_fin_curso: string;
  } | null;
}
export interface StudentDetail extends Omit<AdminStudent, "matchingEnrollments"> {
  status:
    | "pendiente_verificacion"
    | "verificado"
    | "pagado_esperando_cohorte"
    | "activo"
    | "rechazado"
    | "expirado"
    | null;
  mustChangePassword: boolean;
  correo: string | null;
  correoDisponible: boolean;
  fechaNacimiento: string | null;
  tipoSangre: string | null;
  genero: string | null;
  ciudadania: string | null;
  direccion: string | null;
  updatedAt: string;
  enrollments: StudentEnrollment[];
}
