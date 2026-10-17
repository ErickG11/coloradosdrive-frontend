import { api } from "./client";
import { ApiError } from "./errors";
import type { StudentCohortResult } from "@/types/studentCohort";

export function studentCohortPath(studentId: string, enrollmentId: string) {
  return `/admin/estudiantes/${studentId}/matriculas/${enrollmentId}`;
}

export function assignStudentCohort(studentId: string, enrollmentId: string, cohortId: string) {
  return api.post<StudentCohortResult>(
    `${studentCohortPath(studentId, enrollmentId)}/asignar-cohorte`,
    { cohortId },
  );
}

export function studentCohortError(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined;
  const messages: Record<string, string> = {
    COHORT_FULL: "La cohorte ya no tiene cupo. Actualiza las opciones y elige otra.",
    COHORT_CHANGED: "La cohorte o el día cambiaron. Recarga las opciones y confirma de nuevo.",
    COHORT_WINDOW_CLOSED: "La ventana de matrícula no está abierta. Actualiza las opciones.",
    ABONO_EXCEEDS_NET:
      "El abono supera el neto de la cohorte. Elige otra cohorte o revisa la ficha.",
    COHORT_COURSE_MISMATCH:
      "La cohorte no corresponde al curso de esta matrícula. Actualiza las opciones.",
    ENROLLMENT_NOT_PENDING: "La matrícula ya no está pendiente de cohorte. Recarga la ficha.",
    DELETION_PENDING: "El alumno tiene una eliminación pendiente. No se puede asignar cohorte.",
    CD030: "El alumno tiene una eliminación pendiente. No se puede asignar cohorte.",
    ACCOUNT_INACTIVE: "El alumno está inactivo. Recarga la ficha y reactívalo primero.",
    UNCONFIRMED:
      "No se pudo confirmar la asignación; recarga la ficha y verifica antes de repetir.",
    LOCK_CONFLICT: "Otra operación está usando la matrícula. Recarga y vuelve a confirmar.",
  };
  const uncertain = code === "UNCONFIRMED" || !(error instanceof ApiError) || error.status === 503;
  return {
    message: uncertain ? messages.UNCONFIRMED : (code && messages[code]) || error.message,
    refreshOptions: code === "COHORT_CHANGED",
    blocked:
      uncertain ||
      ["ENROLLMENT_NOT_PENDING", "DELETION_PENDING", "CD030", "ACCOUNT_INACTIVE"].includes(
        code ?? "",
      ),
    deletionPending: code === "DELETION_PENDING" || code === "CD030",
  };
}

export function studentCohortAmounts(precio: number, descuento: number, abono: number) {
  const netCents = Math.round(precio * 100) - Math.round(descuento * 100);
  const balanceCents = netCents - Math.round(abono * 100);
  return { neto: netCents / 100, saldo: balanceCents / 100, abonoExcedeNeto: balanceCents < 0 };
}
