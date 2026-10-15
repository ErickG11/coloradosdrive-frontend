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

export interface StudentPracticeRecovery {
  student_id: string;
  slot_id: string;
  cohort_id: string;
  instructor_id: string;
  scheduled_at: string;
  status: "cancelada_por_desactivacion" | "restaurada" | "pendiente_reprogramar";
  reason: string | null;
  updated_at: string;
}
export interface StudentAccessResult {
  id: string;
  activo: boolean;
  reservas: { slotId: string; status: string; reason?: string | null }[];
  recuperacionPendiente: boolean;
}
export interface StudentDeletionOperation {
  student_id: string;
  actor_id: string;
  confirmed_at: string;
  phase: "bloqueo" | "storage" | "auth" | "completo";
  status: "pendiente" | "fallido" | "completo";
  last_retry_actor_id: string | null;
  last_retry_at: string | null;
  retry_count: number;
  data_deleted_by: string | null;
  data_deleted_at: string | null;
  updated_at: string;
}
export interface StudentDeletions {
  items: StudentDeletionOperation[];
  total: number;
  page: number;
  pageSize: number;
}
