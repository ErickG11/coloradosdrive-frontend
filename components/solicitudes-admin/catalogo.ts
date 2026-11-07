// Catálogo de presentación del módulo admin de solicitudes. El servidor sigue siendo la fuente
// de validación; aquí solo viven las etiquetas en español y qué opciones ofrece cada selector.
import type {
  EstadoInscripcion,
  MetodoVerificacion,
  MotivoDevolucion,
  MotivoRechazo,
  Nacionalidad,
  NivelEstudios,
  ResultadoVerificacion,
  SubtipoCertificado,
  TabSolicitudes,
  TipoSangre,
  TipoVerificacion,
} from "@/types/inscripcion";

export const ETIQUETA_ESTADO: Record<
  EstadoInscripcion,
  { label: string; tone: "warning" | "success" | "error" | "info" | "neutral" }
> = {
  borrador: { label: "Borrador", tone: "neutral" },
  enviada: { label: "Pendiente de revisión", tone: "warning" },
  devuelta: { label: "Devuelta al postulante", tone: "info" },
  aprobada: { label: "Aprobada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "error" },
};

export const PESTANAS: { id: TabSolicitudes; label: string }[] = [
  { id: "pendientes", label: "Pendientes" },
  { id: "devueltas", label: "Devueltas" },
  { id: "aprobadas", label: "Aprobadas" },
  { id: "rechazadas", label: "Rechazadas" },
  { id: "todas", label: "Todas" },
];

export const ETIQUETA_NIVEL: Record<NivelEstudios, string> = {
  bachiller: "Bachiller (graduado hace 12 meses o más)",
  bachiller_reciente: "Bachiller reciente (menos de 12 meses)",
  bachiller_exterior: "Bachiller en el exterior",
  decimo_aprobado: "Décimo año aprobado",
  menos_de_decimo: "Menos de décimo año",
};

export const ETIQUETA_NACIONALIDAD: Record<Nacionalidad, string> = {
  ecuatoriana: "Ecuatoriana",
  extranjero_con_cedula: "Extranjero con cédula",
  extranjero_sin_cedula: "Extranjero sin cédula",
};

export const ETIQUETA_SANGRE: Record<TipoSangre, string> = {
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "AB+": "AB+",
  "AB-": "AB-",
  "O+": "O+",
  "O-": "O-",
  no_sabe: "No lo sabe (debe llevar el carné de la Cruz Roja)",
};

export const ETIQUETA_SUBTIPO: Record<SubtipoCertificado, string> = {
  acta_grado: "Acta de grado",
  copia_titulo: "Copia del título",
  certificado_promocion: "Certificado de promoción de 10.º",
  certificado_estudios: "Certificado de estudios",
  resolucion_homologacion: "Resolución de homologación",
};

export const ETIQUETA_TIPO_VERIFICACION: Record<TipoVerificacion, string> = {
  identidad: "Identidad",
  estudios: "Estudios",
};

export const ETIQUETA_METODO: Record<MetodoVerificacion, string> = {
  registro_civil_portal: "Portal del Registro Civil",
  registro_civil_web_service: "Servicio web del Registro Civil",
  ministerio_portal: "Portal del Ministerio de Educación",
  codigo_qr_certificado: "Código QR del certificado",
  llamada_institucion: "Llamada a la institución",
  original_presencial: "Original en persona",
  revision_visual: "Revisión visual",
};

export const ETIQUETA_RESULTADO: Record<ResultadoVerificacion, string> = {
  verificado: "Verificado",
  no_coincide: "No coincide",
  no_encontrado: "No encontrado",
};

export const RESULTADOS: ResultadoVerificacion[] = ["verificado", "no_coincide", "no_encontrado"];

// Todos los métodos manuales habilitan ambos tipos cuando el resultado es verificado.
export function metodosParaVerificacion(): { metodo: MetodoVerificacion; habilita: boolean }[] {
  return (Object.keys(ETIQUETA_METODO) as MetodoVerificacion[])
    .filter((metodo) => metodo !== "registro_civil_web_service")
    .map((metodo) => ({ metodo, habilita: true }));
}

// Motivos con el mensaje predefinido que verá el postulante (refleja el catálogo del servidor).
export const MOTIVOS_DEVOLVER: {
  codigo: MotivoDevolucion;
  label: string;
  mensaje: string | null;
}[] = [
  {
    codigo: "DATOS_NO_COINCIDEN_REGISTRO_CIVIL",
    label: "Los datos no coinciden con el Registro Civil",
    mensaje:
      "Revisa tus nombres, apellidos y fecha de nacimiento: no coinciden con la consulta de identidad.",
  },
  {
    codigo: "CEDULA_MAL_ESCRITA",
    label: "Cédula mal escrita",
    mensaje: "Revisa y corrige el número de cédula.",
  },
  {
    codigo: "TITULO_NO_ENCONTRADO_ADJUNTAR_DOCUMENTO",
    label: "Título no encontrado: adjuntar documento",
    mensaje:
      "No pudimos confirmar tus estudios. Revisa el nivel declarado y adjunta el certificado correspondiente.",
  },
  {
    codigo: "DOCUMENTO_ILEGIBLE_O_INCOMPLETO",
    label: "Documento ilegible o incompleto",
    mensaje:
      "El certificado no se puede leer o está incompleto. Adjunta una copia completa y legible.",
  },
  {
    codigo: "REQUIERE_DOCUMENTO_ESTUDIOS",
    label: "Requiere documento de estudios",
    mensaje: "Adjunta el certificado de estudios correspondiente para continuar la revisión.",
  },
  { codigo: "OTRO", label: "Otro motivo (escribir mensaje)", mensaje: null },
];

export const MOTIVOS_RECHAZAR: {
  codigo: MotivoRechazo;
  label: string;
  mensaje: string | null;
  correo: boolean;
}[] = [
  {
    codigo: "NO_CUMPLE_NIVEL_ESTUDIOS",
    label: "No cumple el nivel de estudios",
    mensaje: "Tu nivel de estudios no cumple los requisitos del curso.",
    correo: true,
  },
  {
    codigo: "NO_CUMPLE_EDAD",
    label: "No cumple la edad mínima",
    mensaje: "Tu edad no cumple el requisito del curso.",
    correo: true,
  },
  {
    codigo: "SOLICITUD_DUPLICADA",
    label: "Solicitud duplicada",
    mensaje: "La solicitud no puede continuar. Contacta a la escuela para revisar tu inscripción.",
    correo: true,
  },
  {
    codigo: "DATOS_INCONSISTENTES_O_FALSOS",
    label: "Datos inconsistentes o falsos",
    mensaje: "La solicitud no fue aprobada por inconsistencias en los datos.",
    correo: false,
  },
  {
    codigo: "SPAM",
    label: "Spam (bloquea el correo por 30 días)",
    mensaje: "La solicitud no fue aprobada. Contacta a la escuela para más información.",
    correo: false,
  },
  { codigo: "OTRO", label: "Otro motivo (escribir mensaje)", mensaje: null, correo: true },
];

export const ETIQUETA_MOTIVO: Record<string, string> = Object.fromEntries([
  ...MOTIVOS_DEVOLVER.map((m) => [m.codigo, m.label]),
  ...MOTIVOS_RECHAZAR.map((m) => [m.codigo, m.label]),
  ["VENCIDA", "Venció el plazo para corregir"],
]);

const FORMATO_FECHA = new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "No registrada";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "No registrada" : FORMATO_FECHA.format(fecha);
}

export const HORAS_ALERTA = 48;

export function superaHoras(valor: string | null, ahora: number, horas = HORAS_ALERTA): boolean {
  if (!valor) return false;
  const marca = new Date(valor).getTime();
  return !Number.isNaN(marca) && ahora - marca > horas * 3_600_000;
}

export function nombreDe(item: {
  nombres: string | null;
  apellidos: string | null;
  nombreCompleto: string | null;
}): string {
  const partes = [item.nombres, item.apellidos].filter(Boolean).join(" ");
  return partes || item.nombreCompleto || "Sin nombre";
}
