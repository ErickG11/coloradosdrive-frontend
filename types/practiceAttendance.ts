export interface AttendanceEvent {
  id: string;
  practiceSlotId: string;
  studentId: string;
  instructorId: string;
  cohortId: string;
  scheduledAt: string;
  durationMinutes: number;
  actorId: string;
  actorRole: "instructor" | "admin";
  createdAt: string;
  tipo: "registro" | "correccion";
  previousAttended: boolean | null;
  newAttended: boolean;
  motivo: string | null;
}
export interface AttendanceEventsPage {
  items: AttendanceEvent[];
  page: number;
  pageSize: number;
  total: number;
}
