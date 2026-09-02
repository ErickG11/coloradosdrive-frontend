export type CourseType = "A" | "B";

// Refleja la tabla `courses` del backend.
export interface Course {
  id: string;
  nombre: string;
  tipo: CourseType;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
}
