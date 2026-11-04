import type { DecisionResult, SolicitudAdminDetalle } from "@/types/inscripcion";

// El contrato final de la decisión y del detalle puede traer el id del alumno creado al aprobar;
// el cliente tipado de F25 aún no lo declara, así que se lee de forma opcional y defensiva.
export type ResultadoDecision = DecisionResult & { studentId?: string | null };
export type DetalleConAlumno = SolicitudAdminDetalle & { studentId?: string | null };
