export type DocumentoTipo = 'cedula' | 'papeleta_votacion' | 'tipo_sangre' | 'titulo_bachiller';
export const DOCUMENTOS: { tipo: DocumentoTipo; label: string }[] = [
  { tipo: 'cedula', label: 'Cédula' }, { tipo: 'papeleta_votacion', label: 'Papeleta de votación' },
  { tipo: 'tipo_sangre', label: 'Tipo de sangre' }, { tipo: 'titulo_bachiller', label: 'Título de bachiller o certificado de décimo' },
];
export interface SolicitudSession { solicitudId: string; token: string }
export interface PrivacyNotice { version: string; contactoDerechos: string; retencionDias: number }
export interface SolicitudProgress {
  enviadaAt?: string | null; motivoRechazo?: string | null;
  courseId: string; estado: string; correoVerificado: boolean; consentimientoVigente: boolean;
  datosGuardados: boolean; solicitadaAt: string | null; requiereRepresentante: boolean; representanteCompleto: boolean;
  documentos: { tipo: DocumentoTipo; estado: string; motivoRechazo?: string | null }[];
}
export interface SolicitudDatos {
  cedula: string; nombreCompleto: string; telefono?: string; fechaNacimiento: string;
  representante?: { nombre: string; cedula: string; acepta: true };
}
export interface DocumentoResult { id: string; tipoDocumento: DocumentoTipo; estado: string; uploadedAt: string }
export interface SolicitudAdmin {
  enviadaAt?: string | null; documentosPorRevisar?: number;
  id: string; courseId: string; cedula: string; nombreCompleto: string; correo: string; telefono: string | null;
  fechaNacimiento: string | null; estado: string; motivoRechazo: string | null; createdAt: string; solicitadaAt: string | null;
  consentimiento: { version: string; aceptadoAt: string; representanteNombre: string | null; representanteCedula: string | null; representanteAcepta: boolean } | null;
  documentos: { tipoDocumento: DocumentoTipo; estado: string; documentoId: string | null; motivoRechazo: string | null }[];
}
export interface SolicitudPage { items: SolicitudAdmin[]; total: number; page: number; pageSize: number }
export interface SolicitudDecision { id: string; estado: string; studentId: string | null; correoEnviado: boolean | null; cohorteAsignada?: { cohortId: string | null; estado: string } }

export interface SolicitudSubmission {id:string;estado:string;enviadaAt:string}
