export interface CourseSubject {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
export interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  kind: "archivo" | "enlace" | "texto";
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  body: string | null;
  is_published: boolean;
}
export interface SubjectItem {
  id: string;
  subject_id: string;
  kind: "material" | "examen";
  material_id: string | null;
  exam_id: string | null;
  order_index: number;
  obligatorio: boolean;
}
export interface AccessRule {
  id: string;
  item_id: string;
  target_type: "cohorte" | "estudiante";
  cohort_id: string | null;
  student_id: string | null;
  habilitado: boolean;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number | null;
  extra_minutes: number;
  note: string | null;
}
export interface AccessPayload {
  scope: "item" | "materia" | "curso";
  scope_id: string;
  target_type: "cohorte" | "estudiante";
  target_id: string;
  habilitado: boolean;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number | null;
  extra_minutes: number;
  note: string | null;
}
export interface AccessDraft {
  targetType: AccessPayload["target_type"];
  targetId: string;
  enabled: boolean;
  opens: string;
  closes: string;
  attempts: string;
  extra: string;
  note: string;
  sourceOpens?: string | null;
  sourceCloses?: string | null;
}
export interface ContentScope {
  scope: AccessPayload["scope"];
  id: string;
  title: string;
  courseId: string;
  hasExams: boolean;
  item?: SubjectItem;
}
export interface ContentAttempt {
  id: string;
  attempt_number: number;
  status: "en_progreso" | "completado";
  score_percent: number | string | null;
  passed: boolean | null;
  started_at: string;
  deadline_at: string;
  completed_at: string | null;
}
export interface ExamResult {
  student_id: string;
  mejor_nota: number | string | null;
  intentos_usados: number;
  intentos_permitidos: number | null;
  intentos: ContentAttempt[];
}
export interface CourseProgress {
  materias: {
    subject_id: string;
    title: string;
    obligatorios_totales: number;
    completados: number;
    porcentaje: number;
    completa: boolean;
  }[];
  global: number;
  completa: boolean;
  sin_contenido: boolean;
  certificado_listo: boolean;
}
export interface CohortProgress {
  students: { student_id: string; nombre_completo: string; global: number; completa: boolean }[];
  promedio_global: number;
  rangos: Record<"0-25" | "26-50" | "51-75" | "76-99" | "100", number>;
}
