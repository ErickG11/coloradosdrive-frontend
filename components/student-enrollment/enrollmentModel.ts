import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import type { StudentPayment } from "@/types/studentPayment";
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
export interface EnrollmentMilestone {
  id: string;
  label: string;
  icon: "send" | "check" | "access" | "calendar" | "payment" | "cohort" | "flag";
  date?: string | null;
  state: "complete" | "current" | "future";
}
export function enrollmentMilestones(
  enrollment: PracticeHistoryEnrollment,
  principal: StudentEnrollmentState | null,
  identity: EnrollmentIdentity | null,
  payment: StudentPayment | null,
  schedule: { reserved: boolean; assigned: boolean },
): EnrollmentMilestone[] {
  const milestones: EnrollmentMilestone[] = [];
  if (principal?.origen === "solicitud") {
    milestones.push({ id: "request", label: "Solicitud enviada", icon: "send", state: "complete" });
    milestones.push({
      id: "approved",
      label: "Solicitud aprobada",
      icon: "check",
      state: "complete",
    });
  }
  if (identity?.createdAt && longDate(identity.createdAt))
    milestones.push({
      id: "account",
      label: "Cuenta creada",
      icon: "access",
      date: identity.createdAt,
      state: "complete",
    });
  // Access is known independently of the Auth account's creation date.
  milestones.push({ id: "access", label: "Acceso habilitado", icon: "access", state: "complete" });
  if (schedule.reserved || schedule.assigned)
    milestones.push({
      id: "schedule",
      label: schedule.reserved ? "Horarios reservados" : "Horarios asignados",
      icon: "calendar",
      state: "complete",
    });
  if (payment?.estado === "aprobado")
    milestones.push({
      id: "payment",
      label: "Pago registrado",
      icon: "payment",
      date: payment.confirmedAt,
      state: "complete",
    });
  if (enrollment.cohortId)
    milestones.push({ id: "cohort", label: "Cohorte asignada", icon: "cohort", state: "complete" });
  const status = enrollmentStatus(enrollment.status);
  milestones.push({
    id: "status",
    label: status.label,
    icon: "flag",
    state:
      enrollment.status === "activo" || enrollment.status === "pendiente_cohorte"
        ? "current"
        : "complete",
  });
  return milestones;
}
