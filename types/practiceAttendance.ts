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

export interface PracticeHistoryEnrollment {
  enrollmentId: string;
  cohortId: string | null;
  courseId: string;
  courseType: "A" | "B";
  status: "activo" | "pendiente_cohorte" | "finalizado" | "retirado";
  horasObjetivo: number | null;
}
export interface PracticeHistoryItem {
  id: string;
  practiceSlotId: string;
  cancellationId: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  slotStatus: string | null;
  attended: boolean | null;
  estado: "asistio" | "no_asistio" | "pendiente" | "liberada" | "falta" | "cancelada";
  resultado: "reprogramable" | "hora_perdida" | "falta" | null;
  motivo: string | null;
}
export interface PracticeHistoryPage {
  enrollmentId: string;
  page: number;
  pageSize: number;
  total: number;
  items: PracticeHistoryItem[];
  summary: { horasAsistidas: number; horasObjetivo: number | null; horasPerdidas: number };
}
