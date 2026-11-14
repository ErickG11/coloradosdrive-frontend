import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import {
  calendarOrdinal,
  longDate,
  SCHOOL_ZONE,
} from "@/components/student-documents/documentsModel";

export { longDate };
export interface EnrollmentIdentity {
  id: string;
  email: string | null;
  role: string | null;
  createdAt: string | null;
  name: string | null;
  cedula: string | null;
}
export type EnrollmentTone =
  "confirmed" | "scheduled" | "pending-review" | "cancelled" | "in-progress";
export function enrollmentStatus(status: PracticeHistoryEnrollment["status"]) {
  const states: Record<string, { label: string; tone: EnrollmentTone }> = {
    activo: { label: "Inscripción activa", tone: "confirmed" },
    pendiente_cohorte: { label: "Pendiente de cohorte", tone: "pending-review" },
    finalizado: { label: "Curso finalizado", tone: "scheduled" },
    retirado: { label: "Matrícula retirada", tone: "cancelled" },
    anulada: { label: "Matrícula anulada", tone: "cancelled" },
  };
  return states[status] ?? { label: "Estado por actualizar", tone: "cancelled" as const };
}
export const shortEnrollmentId = (id: string) => id.replaceAll("-", "").slice(-8).toUpperCase();
export const licenseLabel = (type: "A" | "B") =>
  `Licencia ${type} · ${type === "A" ? "Moto" : "Auto"}`;
export const accountRole = (role: string | null) => (role === "estudiante" ? "Estudiante" : null);
export function practiceDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_ZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
// Only use official course dates here; reserved-slot boundaries are not course dates.
export function courseClock(start: string | null, end: string | null, now: string) {
  if (!start || !end) return null;
  const first = calendarOrdinal(start),
    last = calendarOrdinal(end),
    today = calendarOrdinal(now);
  if (first === null || last === null || today === null || last < first) return null;
  const total = last - first + 1;
  if (today < first)
    return { label: "Días para el inicio", value: first - today, total, progress: 0 };
  if (today > last) return { label: "Curso finalizado", value: null, total, progress: 1 };
  return {
    label: `Día del curso · de ${total}`,
    value: today - first + 1,
    total,
    progress: (today - first + 1) / total,
  };
}
