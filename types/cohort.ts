// Refleja la tabla `cohorts` del backend. `precio` vive en la cohorte (no en
// el curso), ya que cohortes del mismo curso pueden tener precios distintos.
export interface Cohort {
  id: string;
  courseId: string;
  nombre: string;
  precio: number;
  cupoMaximo: number;
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
  updatedAt: string;
}
