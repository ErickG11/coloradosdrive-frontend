import { ApiError } from "@/lib/api/errors";
import type { AccessDraft, AccessPayload, AccessRule, ContentScope } from "@/types/content";

const messages: Record<string, string> = {
  ITEM_NOT_FOUND: "El contenido ya no está disponible. Actualiza la página.",
  ITEM_NO_HABILITADO: "El contenido no está habilitado para ese alumno.",
  ITEM_PROGRAMADO: "La apertura de este contenido todavía no ha llegado.",
  ITEM_CERRADO: "La ventana de acceso terminó.",
  ATTEMPTS_EXHAUSTED:
    "Se agotaron los intentos. Puedes ampliar el máximo con una regla individual.",
  ALREADY_PASSED: "Un examen definitivo aprobado no se puede repetir, incluso con una ampliación.",
  EXAM_NOT_PUBLISHED: "Publica el examen y su materia antes de habilitar el acceso.",
  EXAM_STRUCTURE_FROZEN:
    "El examen ya tiene intentos: solo se pueden corregir títulos, descripciones, enunciados y textos de opciones. Para cambiar claves, puntos, tiempo o barajado, crea otro examen.",
  EXAM_INVALID_QUESTIONS:
    "Para publicar necesitas al menos una pregunta y exactamente una opción correcta en cada pregunta de opción múltiple.",
  CONTENT_HAS_DEPENDENCIES:
    "No se puede quitar o borrar: tiene elementos, reglas, progreso o intentos vinculados. Despublica el contenido para retirarlo del temario visible.",
  SUBJECT_HAS_ITEMS_UNPUBLISH:
    "La materia tiene elementos. Muévelos a otra materia o despublica esta materia.",
  ITEM_HAS_PROGRESS_UNPUBLISH:
    "El elemento tiene progreso o intentos. Despublica su contenido; no se puede quitar.",
  EXAM_HAS_ATTEMPTS_UNPUBLISH: "El examen tiene intentos. Despublícalo para retirarlo del temario.",
  UPLOAD_DAILY_LIMIT: "Se alcanzó el límite de 50 subidas por administrador y día. Intenta mañana.",
  INVALID_CONTENT:
    "Revisa los campos, el enlace HTTPS, el tamaño del texto y las fechas con zona horaria.",
  CONTENT_UNAVAILABLE: "No se pudo conectar con Contenido. Intenta de nuevo.",
  CONTENT_DUPLICATE:
    "El título, la posición o la colocación ya están ocupados. Actualiza el temario y vuelve a intentar.",
  INVALID_ORDER: "El orden cambió. Recarga y envía la lista completa de elementos.",
  CLOSES_AT_PAST:
    "El cierre debe estar en el futuro. Para bloquear una regla vencida, deja el cierre vacío.",
  TARGET_COURSE_MISMATCH: "La cohorte debe pertenecer al curso seleccionado.",
  ITEM_COURSE_MISMATCH: "El examen y la materia deben pertenecer al mismo curso.",
  TARGET_ENROLLMENT_REQUIRED:
    "El alumno necesita matrícula activa, etapa activa y cohorte en este curso.",
  EXAM_RULE_ONLY: "Los intentos y minutos extra solo se aplican a exámenes.",
  INVALID_FILE_SIGNATURE: "El archivo no corresponde a un PDF, PNG o JPG válido.",
  FILE_TOO_LARGE: "El archivo supera 10 MB.",
  INVALID_UPLOAD: "Selecciona un único PDF, PNG o JPG de hasta 10 MB.",
  UPLOAD_FAILED:
    "No se pudo subir el archivo. No vuelvas a enviar hasta comprobar si aparece en Materiales sin colocar.",
};
export function contentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && messages[error.code]) return messages[error.code];
    if (error.status === 400 || error.status === 422)
      return "Revisa los campos obligatorios, los formatos y los límites del formulario.";
    if (error.status === 401) return "Tu sesión venció. Inicia sesión de nuevo.";
    if (error.status === 403)
      return "No tienes permisos para esta acción. Comprueba tu sesión de administrador.";
    if (error.status === 404) return messages.ITEM_NOT_FOUND;
    if (error.status === 409)
      return "El contenido cambió o tiene dependencias. Actualiza la página y revisa el estado antes de repetir.";
    if (error.status === 413) return messages.FILE_TOO_LARGE;
    if (error.status === 429)
      return "Se alcanzó el límite de solicitudes. Espera antes de volver a intentar.";
    return messages.CONTENT_UNAVAILABLE;
  }
  return error instanceof ContentInputError ? error.message : messages.CONTENT_UNAVAILABLE;
}
export class ContentInputError extends Error {}

// Fechas civiles de Guayaquil; no usar la zona del navegador ni toISOString() sobre datetime-local.
export function guayaquilToIso(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new ContentInputError("Escribe una fecha y hora válidas de Guayaquil.");
  const iso = `${value}:00-05:00`;
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime()) || isoToGuayaquil(iso) !== value)
    throw new ContentInputError("La fecha u hora no existe. Revisa día, mes y hora.");
  return iso;
}
export function isoToGuayaquil(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function contentDate(value: string | null): string {
  const local = isoToGuayaquil(value);
  return local ? local.replace("T", " ") + " (Guayaquil)" : "Sin límite";
}
// «vie 13 nov a las 12:20», en la hora de la escuela y sin zona ni segundos.
export function friendlyDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (name: string) => (parts.find((p) => p.type === name)?.value ?? "").replace(/\./g, "");
  return `${part("weekday")} ${part("day")} ${part("month")} a las ${part("hour")}:${part("minute")}`;
}
export function buildAccessPayload(
  scope: ContentScope,
  draft: AccessDraft,
  now = Date.now(),
): AccessPayload {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(draft.targetId))
    throw new ContentInputError("Selecciona una cohorte o un alumno válido.");
  // Conservar segundos/microsegundos de una regla precargada cuando el campo no cambió.
  const date = (local: string, source: string | null | undefined) => {
    const normalized = guayaquilToIso(local);
    if (!normalized || !source || isoToGuayaquil(source) !== local) return normalized;
    const seconds = new Intl.DateTimeFormat("en", {
      timeZone: "America/Guayaquil",
      second: "2-digit",
    })
      .format(new Date(source))
      .padStart(2, "0");
    const fraction = source.match(/:\d{2}(\.\d+)(?:Z|[+-]\d{2}:?\d{2})$/)?.[1] ?? "";
    return `${local}:${seconds}${fraction}-05:00`;
  };
  const opens = date(draft.opens, draft.sourceOpens);
  const closes = draft.enabled ? date(draft.closes, draft.sourceCloses) : null;
  if (closes && (Date.parse(closes) <= now || (opens && Date.parse(closes) <= Date.parse(opens))))
    throw new ContentInputError("El cierre debe ser futuro y posterior a la apertura.");
  const attempts = draft.attempts === "" ? null : Number(draft.attempts);
  const extra = Number(draft.extra);
  if (
    scope.hasExams &&
    ((attempts !== null && (!Number.isInteger(attempts) || attempts < 1 || attempts > 20)) ||
      !Number.isInteger(extra) ||
      extra < 0 ||
      extra > 180)
  )
    throw new ContentInputError("Intentos: 1 a 20 o heredar. Minutos extra: 0 a 180.");
  if (draft.note.length > 300) throw new ContentInputError("La nota admite hasta 300 caracteres.");
  return {
    scope: scope.scope,
    scope_id: scope.id,
    target_type: draft.targetType,
    target_id: draft.targetId,
    habilitado: draft.enabled,
    opens_at: opens,
    closes_at: closes,
    max_attempts: scope.hasExams ? attempts : null,
    extra_minutes: scope.hasExams ? extra : 0,
    note: draft.note.trim() || null,
  };
}
export function ruleToDraft(rule: AccessRule): AccessDraft {
  return {
    targetType: rule.target_type,
    targetId: rule.student_id ?? rule.cohort_id ?? "",
    enabled: rule.habilitado,
    opens: isoToGuayaquil(rule.opens_at),
    closes: isoToGuayaquil(rule.closes_at),
    sourceOpens: rule.opens_at,
    sourceCloses: rule.closes_at,
    attempts: rule.max_attempts === null ? "" : String(rule.max_attempts),
    extra: String(rule.extra_minutes),
    note: rule.note ?? "",
  };
}
export function ruleState(rule: AccessRule, now = Date.now()): string {
  if (!rule.habilitado) return "Bloqueada";
  if (rule.opens_at && Date.parse(rule.opens_at) > now) return "Programada";
  if (rule.closes_at && Date.parse(rule.closes_at) <= now) return "Cerrada";
  return "Abierta";
}
export function safeProgress(value: number, complete: boolean): number {
  return complete ? 100 : Math.min(99.99, Math.max(0, Number.isFinite(value) ? value : 0));
}
