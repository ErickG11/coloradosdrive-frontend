import type { CourseType } from "./course";

// Refleja GET /public/courses (sin autenticación): el backend expone
// deliberadamente menos campos que `Course` (sin descripcion, precios ni
// cupos) — ver coloradosdrive-backend src/models/publicCourse.model.ts.
export interface PublicCourse {
  id: string;
  tipo: CourseType;
  nombre: string;
  horasRequeridas: number | null;
}
