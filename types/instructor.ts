import type { PracticeSlotStatus } from "./practiceSlot";

export interface InstructorSummary {
  id: string;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export interface InstructorDetail extends InstructorSummary {
  correo: string;
}

export interface InstructorList {
  items: InstructorSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstructorOwn {
  profile: InstructorDetail;
  practiceSlots: {
    id: string;
    cohortId: string;
    scheduledAt: string;
    durationMinutes: number;
    status: PracticeSlotStatus;
    studentName: string | null;
  }[];
}
