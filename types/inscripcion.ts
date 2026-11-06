// Refleja coloradosdrive-backend/src/config/enrollmentCatalog.ts y los contratos de
// inscripción en línea (brief del flujo final). Los catálogos se declaran aquí solo como
// tipos y listas de presentación; el servidor sigue siendo la fuente de validación.

export const NACIONALIDADES = [
  "ecuatoriana",
  "extranjero_con_cedula",
  "extranjero_sin_cedula",
] as const;
export type Nacionalidad = (typeof NACIONALIDADES)[number];

export const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "no_sabe"] as const;
export type TipoSangre = (typeof TIPOS_SANGRE)[number];

export const NIVELES_ESTUDIOS = [
  "bachiller",
  "bachiller_reciente",
  "bachiller_exterior",
  "decimo_aprobado",
  "menos_de_decimo",
] as const;
export type NivelEstudios = (typeof NIVELES_ESTUDIOS)[number];

export const SUBTIPOS_CERTIFICADO = [
  "acta_grado",
  "copia_titulo",
  "certificado_promocion",
  "certificado_estudios",
  "resolucion_homologacion",
] as const;
export type SubtipoCertificado = (typeof SUBTIPOS_CERTIFICADO)[number];

export const ESTADOS_INSCRIPCION = [
  "borrador",
  "enviada",
  "devuelta",
  "aprobada",
  "rechazada",
] as const;
export type EstadoInscripcion = (typeof ESTADOS_INSCRIPCION)[number];

export const METODOS_VERIFICACION = [
  "registro_civil_portal",
  "registro_civil_web_service",
  "ministerio_portal",
  "codigo_qr_certificado",
  "llamada_institucion",
  "original_presencial",
  "revision_visual",
] as const;
export type MetodoVerificacion = (typeof METODOS_VERIFICACION)[number];

export const TIPOS_VERIFICACION = ["identidad", "estudios"] as const;
export type TipoVerificacion = (typeof TIPOS_VERIFICACION)[number];

export const RESULTADOS_VERIFICACION = ["verificado", "no_coincide", "no_encontrado"] as const;
export type ResultadoVerificacion = (typeof RESULTADOS_VERIFICACION)[number];

export const MOTIVOS_DEVOLUCION = [
  "DATOS_NO_COINCIDEN_REGISTRO_CIVIL",
  "CEDULA_MAL_ESCRITA",
  "TITULO_NO_ENCONTRADO_ADJUNTAR_DOCUMENTO",
  "DOCUMENTO_ILEGIBLE_O_INCOMPLETO",
  "REQUIERE_DOCUMENTO_ESTUDIOS",
  "OTRO",
] as const;
export type MotivoDevolucion = (typeof MOTIVOS_DEVOLUCION)[number];

export const MOTIVOS_RECHAZO = [
  "NO_CUMPLE_NIVEL_ESTUDIOS",
  "NO_CUMPLE_EDAD",
  "SOLICITUD_DUPLICADA",
  "DATOS_INCONSISTENTES_O_FALSOS",
  "SPAM",
  "OTRO",
] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number];

// Tipos de documento físico: los del checklist de enrollment_documents.
export type TipoDocumentoFisico =
  "tipo_sangre" | "papeleta_votacion" | "titulo_bachiller" | "cedula";

export type ScopeSolicitud = "edicion" | "estado";

// --- Públicos -------------------------------------------------------------

export interface CursoInscripcion {
  id: string;
  tipo: "A" | "B";
  nombre: string;
  edadMinima: number;
}

export interface DocumentoFisicoConfig {
  tipo: TipoDocumentoFisico;
  label: string;
  obligatorio: boolean;
  bloqueaPago: boolean;
}

export interface InscripcionConfig {
  inscripcionesAbiertas: boolean;
  cursos: CursoInscripcion[];
  versionAviso: string;
  versionTerminos: string;
  contactoDerechos: string;
  retencionDias: number;
  umbralBachillerReciente: number;
  documentosFisicos: DocumentoFisicoConfig[];
  captcha: { provider: "turnstile" | "off"; siteKey: string | null };
}

export interface VerificarCorreoInput {
  correo: string;
  courseId: string;
  // El widget Turnstile aún no se carga (F43): con CAPTCHA_PROVIDER=off es opcional.
  captchaToken?: string;
}

export interface MensajeResponse {
  message: string;
}

export interface ConfirmarCodigoInput {
  correo: string;
  codigo: string;
}

export interface ConfirmarCodigoResult {
  solicitudId: string;
  token: string;
}

export interface ConsentimientoInput {
  versionAviso: string;
  versionTerminos: string;
  aceptoTratamiento: boolean;
  declaraVeracidad: boolean;
  aceptoTerminos: boolean;
  representanteAcepta?: boolean;
}

export interface ConsentimientoResult {
  version: string;
  versionAviso: string;
  versionTerminos: string;
  aceptadoAt: string;
}

export interface RepresentanteInput {
  nombre: string;
  cedula: string;
  acepta: true;
}

export interface DatosSolicitudInput {
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  // extranjero_sin_cedula no se registra: el servidor responde ATENCION_POR_CONTACTO.
  nacionalidadTipo: Nacionalidad;
  tipoSangre: TipoSangre;
  nivelEstudios?: Exclude<NivelEstudios, "menos_de_decimo">;
  representante?: RepresentanteInput;
}

export interface TokenSolicitudResult {
  solicitudId: string;
  // Renueva el token de edición de la misma solicitud.
  token: string;
}

export interface DocumentoSubidoResult {
  id: string;
  tipoDocumento: string;
  estado: string;
  uploadedAt: string;
  subtipo?: string;
  mimeType?: string;
  tamano?: number;
}

export interface DevolucionProgreso {
  motivoCodigo: string | null;
  mensaje: string | null;
  devueltaAt: string | null;
}

export interface ProgresoSolicitud {
  identidadVerificada: boolean;
  estudiosVerificados: boolean;
  courseId: string;
  curso: CursoInscripcion | null;
  estado: EstadoInscripcion;
  enviadaAt: string | null;
  correoVerificado: boolean;
  consentimientoVigente: boolean;
  datosGuardados: boolean;
  solicitadaAt: string | null;
  requiereRepresentante: boolean;
  representanteCompleto: boolean;
  nivelEstudios: NivelEstudios | null;
  documentoRequerido: boolean;
  documentoEstudiosPendientePorCupo: boolean;
  devolucion: DevolucionProgreso | null;
  motivoRechazo?: string | null;
  datos: {
    nombres: string | null;
    apellidos: string | null;
    cedula: string | null;
    fechaNacimiento: string | null;
    telefono: string | null;
    nacionalidadTipo: Nacionalidad | null;
    tipoSangre: TipoSangre | null;
    representante: { nombre: string; cedula: string; acepta: boolean } | null;
  };
  pasosCompletos: {
    correo: boolean;
    consentimiento: boolean;
    datos: boolean;
    estudios: boolean;
    enviada: boolean;
  };
  documentos: { tipo: string; estado: string; motivoRechazo: string | null }[];
  puedeEditar: boolean;
}

export interface EnvioSolicitudResult {
  id: string;
  estado: "enviada";
  enviadaAt: string;
}

// --- Admin ----------------------------------------------------------------

export type TabSolicitudes = "pendientes" | "devueltas" | "aprobadas" | "rechazadas" | "todas";

export interface ListarSolicitudesParams {
  page?: number;
  pageSize?: number;
  estado?: EstadoInscripcion;
  q?: string;
}

export interface SolicitudAdminItem {
  id: string;
  courseId: string;
  correo: string;
  nombres: string | null;
  apellidos: string | null;
  nombreCompleto: string | null;
  cedula: string | null;
  estado: EstadoInscripcion;
  nivelEstudios: NivelEstudios | null;
  enviadaAt: string | null;
  devueltaAt: string | null;
  createdAt: string;
}

export interface ListaSolicitudes {
  items: SolicitudAdminItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MedidorDiario {
  usado: number;
  tope: number;
  alerta?: boolean;
}

export interface ResumenSolicitudes {
  pendientes: number;
  devueltas: number;
  conMasDe48h: number;
  cupoCodigosHoy: MedidorDiario;
  cupoSubidasHoy: MedidorDiario;
  cupoSolicitudesHoy?: MedidorDiario;
  alertas?: ("codigos" | "subidas" | "solicitudes")[];
  inscripcionesAbiertas: boolean;
}

export interface VerificacionSolicitud {
  vigente?: boolean;
  id: string;
  tipo: TipoVerificacion;
  metodo: MetodoVerificacion;
  resultado: ResultadoVerificacion;
  nota: string | null;
  porNombre: string | null;
  createdAt: string;
}

export interface CertificadoAdmin {
  id: string;
  subtipo: SubtipoCertificado | null;
  mimeType: string | null;
  tamano: number | null;
  uploadedAt: string;
  verificadoAt: string | null;
}

export interface ConsentimientoAdmin {
  versionAviso: string;
  versionTerminos: string;
  aceptadoAt: string;
  representanteNombre: string | null;
  representanteCedula: string | null;
  representanteAcepta: boolean;
}

export interface SolicitudAdminDetalle extends SolicitudAdminItem {
  studentId?: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  nacionalidadTipo: Nacionalidad | null;
  tipoSangre: TipoSangre | null;
  curso: CursoInscripcion | null;
  documentoRequerido: boolean;
  documentoEstudiosPendientePorCupo: boolean;
  certificado: CertificadoAdmin | null;
  consentimiento: ConsentimientoAdmin | null;
  verificaciones: VerificacionSolicitud[];
  devolucionMotivoCodigo: string | null;
  devolucionMensaje: string | null;
  devolucionNotaInterna: string | null;
  rechazoMotivoCodigo: string | null;
  rechazoNotaInterna: string | null;
}

export interface VerificacionInput {
  tipo: TipoVerificacion;
  metodo: MetodoVerificacion;
  resultado: ResultadoVerificacion;
  nota?: string;
}

export interface UrlCertificado {
  url: string;
  expiresIn: number;
}

export type DecisionInput =
  | { accion: "aprobar"; motivoCodigo?: string; notaInterna?: string }
  | { accion: "devolver"; motivoCodigo: MotivoDevolucion; mensaje?: string; notaInterna?: string }
  | { accion: "rechazar"; motivoCodigo: MotivoRechazo; mensaje?: string; notaInterna?: string };

export interface DecisionResult {
  etapa?: "por_agendar" | "reservado" | "activa";
  id: string;
  estado: EstadoInscripcion;
  cohorte?: { id: string; nombre: string } | null;
  pendienteCohorte?: boolean;
  correoEnviado?: boolean;
}

export interface ConfigInscripcion {
  inscripcionesAbiertas: boolean;
}

export interface ReenvioEnlaceResult {
  correoEnviado: boolean;
}

// --- Alumno e instructor ---------------------------------------------------

export type EstadoDocumentoFisico = "pendiente" | "entregado" | "exento";

export interface DocumentoFisicoEstado {
  label?: string;
  destacado?: boolean;
  tipo: TipoDocumentoFisico;
  estado: EstadoDocumentoFisico;
  obligatorio: boolean;
  exento: boolean;
}

export interface EstadoInscripcionAlumno {
  requisitosVerificados: boolean;
  puedePagar: boolean;
  motivoBloqueo: string | null;
  cohorte: { id: string; nombre: string } | null;
  documentosFisicos: DocumentoFisicoEstado[];
  fechaLimite: string | null;
  diasRestantes: number | null;
  identidadPresencial: { confirmada: boolean; confirmadaAt: string | null } | null;
}

export interface IdentidadPresencialInput {
  cedulaOriginalVista: true;
  certificadoOriginalVisto?: boolean;
}
