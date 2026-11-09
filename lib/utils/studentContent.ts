import { ApiError } from "@/lib/api/errors";
import { contentDate, contentErrorMessage } from "./content";
import type { StudentItem } from "@/types/studentContent";

export const AUTO_SEND_MARGIN_MS = 10_000;
export interface ServerClock {
  serverMs: number;
  receivedMs: number;
}
// Anchor to performance.now(), so changing the device's wall clock cannot extend an attempt.
export function serverClock(iso: string, sentMs: number, receivedMs: number): ServerClock {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed) || receivedMs < sentMs) throw new Error("Invalid server clock");
  return { serverMs: parsed + (receivedMs - sentMs) / 2, receivedMs };
}
export function serverTime(clock: ServerClock, monotonicMs: number): number {
  return clock.serverMs + Math.max(0, monotonicMs - clock.receivedMs);
}
export function remainingTime(deadline: string, clock: ServerClock, monotonicMs: number): number {
  const end = Date.parse(deadline);
  return Number.isFinite(end) ? Math.max(0, end - serverTime(clock, monotonicMs)) : 0;
}
export function shouldAutoSend(remaining: number): boolean {
  return remaining > 0 && remaining <= AUTO_SEND_MARGIN_MS;
}
export function timeWarning(remaining: number): string {
  if (remaining <= 0) return "El tiempo terminó. Consultando el resultado…";
  if (remaining <= AUTO_SEND_MARGIN_MS) return "Enviando antes de que termine el plazo.";
  if (remaining <= 60_000) return "Queda menos de un minuto. Revisa y envía tus respuestas.";
  if (remaining <= 300_000) return "Quedan menos de cinco minutos.";
  return "";
}
export function countdown(remaining: number): string {
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function accessLabel(access: StudentItem["access"]): string {
  switch (access.estado) {
    case "no_habilitado":
      return "Aún no disponible";
    case "programado":
      return `Se abre el ${contentDate(access.opens_at)}`;
    case "cerrado":
      return `Cerró el ${contentDate(access.closes_at)}`;
    case "abierto":
      return access.closes_at ? `Cierra el ${contentDate(access.closes_at)}` : "Disponible";
  }
}
export function studentContentError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "ATTEMPT_COMPLETED":
        return "Este intento ya fue enviado. Consulta su resultado.";
      case "ATTEMPT_EXPIRED":
        return "El tiempo del intento terminó. El servidor no acepta respuestas fuera del plazo.";
      case "ATTEMPTS_EXHAUSTED":
        return "Ya usaste todos los intentos disponibles. Consulta con administración si necesitas una ampliación.";
      case "ALREADY_PASSED":
        return "Ya aprobaste este examen definitivo y no puedes repetirlo.";
      case "EXAM_NOT_PUBLISHED":
        return "Este examen no está publicado. Vuelve al curso para revisar el contenido disponible.";
      case "ITEM_NO_HABILITADO":
        return "Este contenido todavía no está habilitado para ti.";
    }
    if (error.status === 403)
      return "Tu cuenta no tiene acceso a este contenido. Revisa tu matrícula o consulta con administración.";
  }
  return contentErrorMessage(error);
}
