/** Contratos aditivos 068/069. No activan flujos ni contienen nombres/códigos de cohorte. */
export type EnrollmentRuleKey =
  | "prices"
  | "date_rules"
  | "capacity"
  | "reservations"
  | "payments"
  | "cohort_admin"
  | "enrollment_access"
  | "waitlist"
  | "schedule_changes"
  | "billing"
  | "identity"
  | "foreign_identity"
  | "permissions"
  | "metrics";
export type EnrollmentPermission =
  "verify_identity" | "manage_cohorts_prices" | "reassign_schedules" | "view_payments_invoices";
export type IndividualDatesSource =
  "practice_plan" | "reservation_holds" | "practice_slots" | "approved_exception";
/** Transporte futuro separado de la cohorte. Fecha civil ISO, importes en centavos USD. */
export interface IndividualEnrollmentSnapshot {
  practiceStartDate: string | null;
  practiceEndDate: string | null;
  accessEndDate: string | null;
  paidAmountCentavos: number | null;
  datesSource: IndividualDatesSource | null;
  guardReady: boolean;
}
