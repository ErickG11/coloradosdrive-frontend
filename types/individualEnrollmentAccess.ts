import type { EnrollmentStatus } from "./enrollment";
import type { IndividualDatesSource } from "./enrollmentFoundation";
export interface IndividualEnrollmentAccess {
  active: boolean;
  serverNow: string;
  enrollments: {
    id: string;
    courseId: string;
    type: "A" | "B";
    status: EnrollmentStatus;
    eligible: boolean;
    practiceStartDate: string | null;
    practiceEndDate: string | null;
    accessEndDate: string | null;
    guardReady: boolean;
    paidAmountCentavos: number | null;
    datesSource: IndividualDatesSource | null;
  }[];
}
