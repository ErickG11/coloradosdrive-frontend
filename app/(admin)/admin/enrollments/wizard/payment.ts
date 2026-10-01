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
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100);
}

export interface PaymentSummary {
  grossCents: number | null;
  discountCents: number;
  netCents: number | null;
  paidCents: number;
  balanceCents: number | null;
  error: string | null;
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
  if (course.cohortId && grossCents === null) error = "No se pudo leer el precio de la cohorte.";
  else if (discountCents === null || (payment.modalidad === "abono" && enteredPaidCents === null))
    error = "Ingresa montos no negativos con hasta dos decimales.";
  else if (!course.cohortId && (discountCents !== 0 || payment.modalidad !== "abono"))
    error = "Sin cohorte solo se permite abono y descuento cero.";
  else if (netCents !== null && netCents < 0)
    error = "El descuento no puede superar el precio de la cohorte.";
  else if (netCents !== null && paidCents !== null && paidCents > netCents)
    error = "El abono no puede superar el monto total neto.";
  else if (netCents !== null && payment.modalidad === "abono" && paidCents === netCents)
    error = "Si se abona el total, selecciona pago completo.";
  return {
    grossCents,
    discountCents: discountCents ?? 0,
    netCents,
    paidCents: paidCents ?? 0,
    balanceCents: netCents === null || paidCents === null ? null : netCents - paidCents,
    error,
  };
}
