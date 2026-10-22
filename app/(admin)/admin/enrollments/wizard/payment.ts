import { formatMoneyFromCents } from "@/lib/utils/money";
import { MESSAGES } from "./validation";
import type { CourseSelection, PaymentDraft } from "./wizardTypes";

export function parseCents(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    const scaled = value * 100;
    const cents = Math.round(scaled);
    return Number.isSafeInteger(cents) && Math.abs(scaled - cents) < 1e-7 ? cents : null;
  }
  if (typeof value !== "string" || !/^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatCents(cents: number): string {
  return formatMoneyFromCents(cents);
}

export interface PaymentSummary {
  grossCents: number | null;
  discountCents: number;
  netCents: number | null;
  paidCents: number;
  balanceCents: number | null;
  error: string | null;
  /** Control del paso Documentos y pago al que pertenece el error (id del campo). */
  errorField: "descuento" | "montoAbonado" | "modalidadPago" | null;
}

export function summarizePayment(course: CourseSelection, payment: PaymentDraft): PaymentSummary {
  const discountCents = parseCents(payment.descuento);
  const enteredPaidCents = parseCents(payment.montoAbonado);
  const grossCents = course.cohortId ? parseCents(course.cohort?.precio ?? "") : null;
  const netCents =
    grossCents === null || discountCents === null ? null : grossCents - discountCents;
  const paidCents =
    payment.modalidad === "completo" && netCents !== null ? netCents : enteredPaidCents;
  let error: string | null = null;
  let errorField: PaymentSummary["errorField"] = null;
  const fail = (message: string, field: PaymentSummary["errorField"]) => {
    error = message;
    errorField = field;
  };
  if (course.cohortId && grossCents === null)
    fail("No se pudo leer el precio de la cohorte.", null);
  else if (discountCents === null)
    fail("Ingresa montos no negativos con hasta dos decimales.", "descuento");
  else if (payment.modalidad === "abono" && enteredPaidCents === null)
    fail("Ingresa montos no negativos con hasta dos decimales.", "montoAbonado");
  else if (!course.cohortId && (discountCents !== 0 || payment.modalidad !== "abono"))
    fail("Sin cohorte solo se permite abono y descuento cero.", "modalidadPago");
  else if (netCents !== null && netCents < 0)
    fail("El descuento no puede superar el precio de la cohorte.", "descuento");
  else if (netCents !== null && paidCents !== null && paidCents > netCents)
    fail("El abono no puede superar el monto total neto.", "montoAbonado");
  else if (netCents !== null && payment.modalidad === "abono" && paidCents === netCents)
    fail("Si se abona el total, selecciona pago completo.", "modalidadPago");
  // El servidor lo exige con cohorte; sin cohorte (pendiente) el abono 0 se permite.
  else if (course.cohortId && payment.modalidad === "abono" && paidCents === 0)
    fail(MESSAGES.abonoCero, "montoAbonado");
  return {
    grossCents,
    discountCents: discountCents ?? 0,
    netCents,
    paidCents: paidCents ?? 0,
    balanceCents: netCents === null || paidCents === null ? null : netCents - paidCents,
    error,
    errorField,
  };
}
