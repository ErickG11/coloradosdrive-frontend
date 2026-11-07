import { ApiError } from "./errors";

// Mensajes en español claro para los códigos estables del backend (utils/solicitudError.ts y
// servicios de inscripción). Nunca se muestra texto técnico del servidor al postulante.
const MENSAJES_POR_CODIGO: Record<string, string> = {
  // Disponibilidad y topes
  INSCRIPCIONES_CERRADAS:
    "Las inscripciones en línea están cerradas por ahora. Escríbenos por WhatsApp y te atendemos.",
  CUPO_DIARIO_AGOTADO:
    "Se alcanzó el límite de solicitudes de hoy. Intenta mañana o escríbenos por WhatsApp.",
  LIMITE_PETICIONES: "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  VERIFICACION_NO_DISPONIBLE:
    "No pudimos completar la verificación en este momento. Intenta de nuevo o escríbenos por WhatsApp.",
  CONFIGURACION_NO_DISPONIBLE:
    "No pudimos consultar la configuración. Intenta de nuevo en unos minutos.",
  SERVICIO_NO_DISPONIBLE:
    "El servicio no está disponible por ahora. Intenta de nuevo en unos minutos.",
  CURSO_NO_DISPONIBLE: "El curso no está disponible. Contacta a la escuela.",
  PROCESAMIENTO_OCUPADO:
    "Estamos procesando muchos archivos. Espera unos segundos y vuelve a intentarlo.",
  // Captcha
  CAPTCHA_INVALIDO: "No pudimos comprobar que eres una persona. Inténtalo de nuevo.",
  // Correo y código
  CORREO_INVALIDO: "Ingresa un correo electrónico válido.",
  CORREO_NO_ADMITIDO: "Ese correo no está admitido. Usa otro correo personal.",
  CORREO_NO_VERIFICADO: "Primero verifica tu correo con el código que te enviamos.",
  CORREO_YA_APROBADO: "Ese correo ya tiene una inscripción aprobada. Inicia sesión.",
  CODIGO_INVALIDO_O_VENCIDO: "El código es incorrecto o venció. Revisa tu correo o pide uno nuevo.",
  INTENTOS_AGOTADOS: "Alcanzaste el máximo de intentos. Pide un código nuevo más tarde.",
  // Sesión de solicitud
  TOKEN_INVALIDO_O_VENCIDO:
    "Tu sesión venció. Vuelve a ingresar tu correo para recibir un código nuevo.",
  SCOPE_INSUFICIENTE:
    "Esta sesión solo permite consultar el estado. Si necesitas editar, verifica tu correo otra vez.",
  ACCESO_DENEGADO: "No tienes permiso para realizar esta acción.",
  SESION_REQUERIDA: "Inicia sesión para continuar.",
  // Estado
  ESTADO_INCORRECTO: "Esta acción no corresponde al estado actual de tu solicitud.",
  SOLICITUD_CERRADA: "Tu solicitud ya no admite cambios.",
  SOLICITUD_ENVIADA: "Tu solicitud ya fue enviada.",
  SOLICITUD_NO_ENVIADA: "Tu solicitud todavía no fue enviada.",
  SOLICITUD_INCOMPLETA: "Faltan datos o documentos para enviar tu solicitud.",
  CONFLICTO_SOLICITUD: "Tu solicitud cambió mientras la editabas. Recarga e inténtalo de nuevo.",
  NO_ENCONTRADO: "No encontramos la solicitud. Verifica tu correo para continuar.",
  // Consentimiento
  CONSENTIMIENTO_REQUERIDO: "Acepta el aviso de privacidad y los términos para continuar.",
  AVISO_DESACTUALIZADO: "El aviso de privacidad cambió. Léelo de nuevo y acéptalo.",
  TERMINOS_DESACTUALIZADOS: "Los términos cambiaron. Léelos de nuevo y acéptalos.",
  // Datos
  DATOS_REQUERIDOS: "Completa tus datos personales para continuar.",
  DATOS_INCOMPLETOS: "Faltan datos por completar.",
  DATOS_INVALIDOS: "Revisa los datos ingresados.",
  DATOS_CAMBIARON: "Tus datos cambiaron mientras subías el archivo. Vuelve a intentarlo.",
  DATOS_NO_REGISTRADOS:
    "No pudimos continuar con estos datos. Si ya enviaste una solicitud o ya eres alumno, consulta el estado con tu correo o comunícate con la escuela.",
  CAMPO_INVALIDO: "Revisa este dato: no tiene un formato válido.",
  CAMPO_NO_PERMITIDO:
    "Se envió un dato que no corresponde. Recarga la página e inténtalo de nuevo.",
  CUERPO_INVALIDO: "No pudimos leer tu solicitud. Recarga la página e inténtalo de nuevo.",
  INVALID_JSON: "No pudimos leer tu solicitud. Recarga la página e inténtalo de nuevo.",
  INVALID_FIELD: "Revisa los datos ingresados.",
  NOMBRE_INVALIDO: "Usa solo letras, espacios, apóstrofe o guion, de 2 a 60 caracteres.",
  CEDULA_INVALIDA: "La cédula no es válida. Revisa los 10 dígitos.",
  TELEFONO_INVALIDO: "Ingresa un celular de 10 dígitos (09XXXXXXXX) o un convencional válido.",
  FECHA_INVALIDA: "Ingresa una fecha de nacimiento real y no futura.",
  EDAD_MINIMA: "Tu edad es inferior al mínimo requerido para este curso.",
  EDAD_MAXIMA: "La edad máxima permitida es de 100 años cumplidos.",
  ATENCION_POR_CONTACTO: "Atendemos tu inscripción por WhatsApp. Escríbenos y te ayudamos.",
  REPRESENTANTE_REQUERIDO:
    "Por ser menor de edad, completa los datos y la autorización del representante legal.",
  REPRESENTANTE_INVALIDO: "Revisa los datos del representante legal.",
  REPRESENTANTE_NO_APLICA: "No se requieren datos del representante para una persona adulta.",
  // Estudios y archivo
  NIVEL_ESTUDIOS_INVALIDO: "Selecciona un nivel de estudios válido.",
  NIVEL_ESTUDIOS_NO_ADMITIDO: "Necesitas haber aprobado al menos décimo año para inscribirte.",
  NIVEL_NO_REQUIERE_ARCHIVO: "Tu nivel de estudios no requiere subir un archivo.",
  SUBTIPO_CERTIFICADO_INVALIDO: "Ese documento no corresponde a tu nivel de estudios.",
  ARCHIVO_REQUERIDO: "Adjunta el archivo para continuar.",
  ARCHIVO_INVALIDO: "No pudimos usar ese archivo. Sube una foto o un PDF legible.",
  ARCHIVO_TIPO_NO_PERMITIDO: "Solo se aceptan fotos JPG o PNG y archivos PDF.",
  ARCHIVO_DEMASIADO_GRANDE: "El archivo supera el máximo de 2 MB. Sube uno más liviano.",
  LIMIT_FILE_SIZE: "El archivo supera el máximo de 2 MB. Sube uno más liviano.",
  // Admin y otros roles
  MFA_REQUERIDA: "Activa la verificación en dos pasos para usar este panel.",
  ADMIN_MFA_REQUIRED: "Activa la verificación en dos pasos para usar este panel.",
  MOTIVO_REQUERIDO: "Indica un motivo para esta decisión.",
  MOTIVO_INVALIDO: "Selecciona un motivo válido.",
  MOTIVO_NO_APLICA: "Ese motivo no aplica a esta acción.",
  MENSAJE_NO_APLICA: "Este motivo no admite un mensaje adicional.",
  METODO_INVALIDO: "Ese método de verificación no es válido para este caso.",
  APROBACION_NO_CONFIRMADA: "Confirma la aprobación para continuar.",
  DOCUMENTO_YA_REVISADO: "Este documento ya fue revisado.",
  DOCUMENTO_YA_APROBADO: "Este documento ya fue aprobado.",
  REQUISITOS_PENDIENTES:
    "Tus requisitos de inscripción aún están en revisión. No puedes realizar esta acción todavía.",
  ERROR_INTERNO: "Ocurrió un error inesperado. Intenta de nuevo en unos minutos.",
  INTERNAL_ERROR: "Ocurrió un error inesperado. Intenta de nuevo en unos minutos.",
};

// Defensa S1: nunca trasladar códigos de identidad del panel al postulante.
const CODIGOS_IDENTIDAD_ADMIN = new Set([
  "CEDULA_DUPLICADA",
  "IDENTIDAD_NO_VERIFICADA",
  "ESTUDIOS_NO_VERIFICADOS",
  "CUENTA_YA_EXISTE",
]);

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en unos minutos.";
const MENSAJE_SIN_CONEXION =
  "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.";

// Códigos tras los cuales el token en memoria ya no sirve y hay que verificar el correo otra vez.
const CODIGOS_SESION_VENCIDA = new Set(["TOKEN_INVALIDO_O_VENCIDO", "SCOPE_INSUFICIENTE"]);
// Códigos que se resuelven derivando al postulante a WhatsApp.
const CODIGOS_DERIVAR_WHATSAPP = new Set([
  "INSCRIPCIONES_CERRADAS",
  "CUPO_DIARIO_AGOTADO",
  "VERIFICACION_NO_DISPONIBLE",
  "ATENCION_POR_CONTACTO",
]);

export function inscripcionErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

// Mensaje en español para el postulante. Usa el código estable; si no es conocido recurre al
// estado HTTP y nunca muestra el texto técnico del servidor.
export function inscripcionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return MENSAJE_SIN_CONEXION;
  if (error.code && CODIGOS_IDENTIDAD_ADMIN.has(error.code))
    return MENSAJES_POR_CODIGO.DATOS_NO_REGISTRADOS;
  if (error.code && error.code in MENSAJES_POR_CODIGO) return MENSAJES_POR_CODIGO[error.code];
  switch (error.status) {
    case 401:
      return MENSAJES_POR_CODIGO.TOKEN_INVALIDO_O_VENCIDO;
    case 403:
      return MENSAJES_POR_CODIGO.ACCESO_DENEGADO;
    case 404:
      return MENSAJES_POR_CODIGO.NO_ENCONTRADO;
    case 409:
      return MENSAJES_POR_CODIGO.CONFLICTO_SOLICITUD;
    case 413:
      return MENSAJES_POR_CODIGO.ARCHIVO_DEMASIADO_GRANDE;
    case 429:
      return MENSAJES_POR_CODIGO.LIMITE_PETICIONES;
    case 502:
    case 503:
      return MENSAJES_POR_CODIGO.SERVICIO_NO_DISPONIBLE;
    default:
      return MENSAJE_GENERICO;
  }
}

// El token en memoria ya no es válido: la pantalla debe volver al paso del correo.
export function requiereVerificarCorreoDeNuevo(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code) return CODIGOS_SESION_VENCIDA.has(error.code);
  return error.status === 401;
}

export function sugiereWhatsapp(error: unknown): boolean {
  const code = inscripcionErrorCode(error);
  return code !== undefined && CODIGOS_DERIVAR_WHATSAPP.has(code);
}

// Campo del formulario al que pertenece el error, para mostrarlo junto al campo.
export function inscripcionErrorField(error: unknown): string | undefined {
  if (error instanceof ApiError && error.code && CODIGOS_IDENTIDAD_ADMIN.has(error.code))
    return undefined;
  return error instanceof ApiError ? error.field : undefined;
}

// Error del flujo de inscripción: añade los documentos faltantes que el servidor informa en
// SOLICITUD_INCOMPLETA (detalles.faltantes).
export class InscripcionApiError extends ApiError {
  readonly faltantes: string[];

  constructor(
    message: string,
    status: number,
    metadata?: { code?: string; field?: string; faltantes?: string[] },
  ) {
    super(message, status, metadata);
    this.name = "InscripcionApiError";
    this.faltantes = metadata?.faltantes ?? [];
  }
}
