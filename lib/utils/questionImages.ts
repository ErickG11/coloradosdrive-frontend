import { ApiError } from "@/lib/api/errors";
import type { ExamFormValues, QuestionFormValue } from "@/types/examDraft";

export const QUESTION_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const QUESTION_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export function imageFileLabel(name: string): string {
  return (
    name
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 100) || "Imagen seleccionada"
  );
}
async function header(file: File): Promise<ArrayBuffer> {
  const blob = file.slice(0, 16);
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la imagen."));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen. Selecciónala de nuevo."));
    reader.readAsArrayBuffer(blob);
  });
}
export async function validateQuestionImage(
  file: File,
): Promise<{ mime: string; filename: string }> {
  if (file.size > QUESTION_IMAGE_MAX_BYTES)
    throw new Error("La imagen supera el máximo de 3 MiB (3 MB). Elige una más pequeña.");
  const bytes = new Uint8Array(await header(file));
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    return { mime: "image/png", filename: "pregunta.png" };
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { mime: "image/jpeg", filename: "pregunta.jpg" };
  if (
    bytes.length >= 16 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(ascii(12, 16))
  )
    return { mime: "image/webp", filename: "pregunta.webp" };
  throw new Error(
    "Solo se admiten imágenes PNG, JPG o WebP válidas. SVG no está permitido, aunque cambies su nombre a .png.",
  );
}
export function questionImageError(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      IMAGE_TOO_LARGE: "La imagen supera el máximo de 3 MiB. Elige una más pequeña.",
      IMAGE_TYPE_INVALID: "La imagen no es un PNG, JPG o WebP válido. SVG no está permitido.",
      IMAGE_REQUIRED: "Selecciona una imagen antes de subirla.",
      IMAGE_UPLOAD_INVALID:
        "Selecciona una sola imagen PNG, JPG o WebP y un texto alternativo opcional.",
      IMAGE_NOT_FOUND: "Esta pregunta ya no tiene imagen. Recarga sus datos antes de continuar.",
      IMAGE_CONFLICT: "Otra edición cambió la imagen. Recarga la pregunta antes de reintentar.",
      IMAGE_ALT_INVALID: "La descripción debe tener como máximo 300 caracteres.",
      EXAM_PUBLISHED_UNPUBLISH: "Despublica para editar la imagen o su descripción.",
      EXAM_STRUCTURE_FROZEN:
        "El examen tiene intentos: no puedes agregar, reemplazar ni quitar imágenes. Sí puedes corregir su descripción al despublicar.",
      UPLOAD_DAILY_LIMIT:
        "Se alcanzó la cuota de 50 subidas del día. Esta cuota se comparte con Contenido; inténtalo mañana.",
      IMAGE_UPLOAD_FAILED:
        "No se pudo subir la imagen. El resto del examen está guardado; puedes reintentar.",
      CONTENT_UNAVAILABLE:
        "No se pudo conectar. El resto del examen está guardado; vuelve a intentar la imagen.",
      ATTEMPT_EXPIRED: "El tiempo del intento terminó. Ya no se pueden renovar sus imágenes.",
      ITEM_NOT_FOUND: "La imagen o el intento ya no están disponibles para tu cuenta.",
    };
    if (messages[error.code ?? ""]) return messages[error.code ?? ""];
    if (error.status === 413) return messages.IMAGE_TOO_LARGE;
    if (error.status === 429) return messages.UPLOAD_DAILY_LIMIT;
  }
  return "No se pudo cargar la imagen. Intenta de nuevo sin salir de esta página.";
}
export const questionDraftKey = (question: QuestionFormValue) =>
  question.draftKey ?? question.id ?? "initial";
export function keepQuestionDraftKeys(
  fresh: QuestionFormValue[],
  previous: QuestionFormValue[],
  bindings: Record<string, string>,
): QuestionFormValue[] {
  const byId = new Map(
    previous.flatMap((question) => {
      const id = question.id ?? bindings[questionDraftKey(question)];
      return id ? [[id, question] as const] : [];
    }),
  );
  return fresh.map((question) => {
    const before = question.id ? byId.get(question.id) : undefined;
    return before?.draftKey ? { ...question, draftKey: before.draftKey } : question;
  });
}
export function examContentFingerprint(values: ExamFormValues): string {
  return JSON.stringify({
    ...values,
    questions: values.questions.map((question) => {
      const copy = { ...question };
      delete copy.image;
      return copy;
    }),
  });
}
