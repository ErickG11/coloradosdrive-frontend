import type { IndividualEnrollmentSnapshot } from "./enrollmentFoundation";
import type { EstadoInscripcionAlumno } from "./inscripcion";
import type { EnrollmentStage } from "./enrollment";

export interface StudentEnrollmentState extends EstadoInscripcionAlumno {
  enrollmentId: string | null;
  individualDates?: IndividualEnrollmentSnapshot;
  origen: "manual" | "solicitud" | null;
  etapa: EnrollmentStage | "sin_matricula";
  accesoCompleto: boolean;
  pasos: { documentos: boolean; horario: boolean; pago: boolean };
  serverNow: string;
  reserva: {
    expiraAt: string;
    serverNow: string;
    cohorte: { id: string; nombre?: string } | null;
  } | null;
  verificaciones: {
    identidad: boolean;
    estudios: boolean;
    tipoSangreDeclarado: string | null;
    nivelEstudios: string | null;
  };
}
