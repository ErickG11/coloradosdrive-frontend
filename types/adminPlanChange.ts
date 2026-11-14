import type { StudentScheduleReservation, StudentReservationPlan } from "./studentSchedule";
export interface PlanChangeState {
  active: boolean;
  studentId?: string;
  canChange?: boolean;
  reasonCode?: string | null;
  reason?: string;
  serverNow?: string;
  windowClosesAt?: string | null;
  calendarEndDate?: string | null;
  reservation?: StudentScheduleReservation | null;
  current?: {
    practiceStartDate: string | null;
    practiceEndDate: string | null;
    accessEndDate: string | null;
  };
}
export interface PlanChangePreview {
  factible: boolean;
  franjas: { scheduledAt: string }[];
  precioCentavos: number;
  serverNow: string;
  plan: StudentReservationPlan | null;
}
export interface PlanChangeCalendar {
  serverNow: string;
  dias: import("@/components/student-enrollment/PlanFields").PlanCalendarDay[];
}
