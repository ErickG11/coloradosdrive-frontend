import type { CourseProgress, CourseSubject, SubjectItem } from "./content";
import type { StartAttemptResult } from "./examAttempt";

export interface StudentCourse {
  course_id: string;
  nombre: string;
  tipo: string;
}
export interface StudentItem extends SubjectItem {
  title: string;
  description: string | null;
  completado: boolean;
  material_kind?: "archivo" | "enlace" | "texto";
  access: {
    estado: "no_habilitado" | "programado" | "abierto" | "cerrado";
    fuente: "estudiante" | "cohorte" | "ninguna";
    opens_at: string | null;
    closes_at: string | null;
    max_attempts: number | null;
    extra_minutes: number;
  };
  intentos_usados?: number;
  intentos_permitidos?: number | null;
  mejor_nota?: number | null;
  intento_en_progreso?: { id: string; deadline_at: string } | null;
  bloqueado?: boolean;
  prerequisitos_pendientes?: { item_id: string; titulo: string }[];
}
export interface StudentCatalog {
  course_id: string;
  materias: (CourseSubject & { items: StudentItem[] })[];
  progreso: CourseProgress;
  continuar: { subject_id: string; item_id: string } | null;
  server_now: string;
}
export type ActiveStudentAttempt = StartAttemptResult & {
  deadlineAt: string;
  attemptNumber: number;
  maxAttemptsAplicado: number | null;
  minutosAplicados: number;
};
export type OpenMaterial =
  | { kind: "texto"; title: string; body: string; url: null }
  | { kind: "archivo" | "enlace"; title: string; url: string };
