// Refleja la tabla `cohorts` del backend. `precio` vive en la cohorte (no en
// el curso), ya que cohortes del mismo curso pueden tener precios distintos.
//
// La escuela maneja dos ventanas distintas por cohorte: la de matrícula
// (cuándo se puede inscribir gente, y cuyo fin es el plazo real para
// entregar documentos físicos) y la de curso/prácticas (ventana dentro de
// la cual deben caber todas las prácticas elegidas). Duran de forma
// variable de una cohorte a otra, nunca asumir un tamaño fijo.
export interface Cohort {
  id: string;
  courseId: string;
  nombre: string;
  precio: number;
  cupoMaximo: number;
  fechaInicioMatricula: string;
  fechaFinMatricula: string;
  fechaInicioCurso: string;
  fechaFinCurso: string;
  // Metadata opcional, solo informativa (refleja el oficio real de la
  // escuela a la ANT) — no se usa en ninguna validación ni lógica.
  tipoModalidad: string | null;
  horariosCapacitacionTeoria: string | null;
  numeroVehiculos: number | null;
  numeroAulas: number | null;
  createdAt: string;
  updatedAt: string;
}

// Matrículas de la cohorte por estado (GET /cohorts/:id, contrato L4b).
// `activos` ocupa cupo; cualquier matrícula (total > 0) impide cambiar el curso.
export interface CohortStudentCounts {
  total: number;
  activos: number;
  finalizados: number;
  retirados: number;
}

// Detalle de una cohorte (GET /cohorts/:id). `updatedAt` es la versión para
// el PATCH: se guarda y se reenvía como cadena EXACTA (con microsegundos),
// nunca convertida a Date.
export interface CohortDetail extends Cohort {
  alumnos: CohortStudentCounts;
}
