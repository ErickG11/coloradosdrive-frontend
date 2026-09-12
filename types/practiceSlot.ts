export const PRACTICE_SLOT_STATUSES = [
  "disponible",
  "asignado",
  "confirmado",
  "liberado",
  "sin_practica",
  "completado",
] as const;
export type PracticeSlotStatus = (typeof PRACTICE_SLOT_STATUSES)[number];

// Refleja coloradosdrive-backend/src/models/practiceSlot.model.ts. studentId
// es null salvo en asignado/confirmado/completado.
export interface PracticeSlot {
  id: string;
  cohortId: string;
  instructorId: string;
  studentId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: PracticeSlotStatus;
  confirmationNotifiedAt: string | null;
  releaseNotifiedAt: string | null;
  confirmedAt: string | null;
  attended: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// Forma que devuelve GET /practice-slots (admin/estudiante/instructor):
// el backend embebe estos 2 nombres vía PostgREST en vez de que cada rol
// tenga que resolverlos por su cuenta contra /users (ver docs/adr/008 en
// el backend). Las acciones (crear/editar/reclamar/confirmar/cancelar/
// marcar asistencia) siguen devolviendo PracticeSlot, sin nombres.
export interface PracticeSlotWithNames extends PracticeSlot {
  instructorName: string;
  studentName: string | null;
}

// El admin crea la franja sin estudiante (status inicial 'disponible' lo
// aplica el backend, no se envía aquí).
export interface CreatePracticeSlotInput {
  cohortId: string;
  instructorId: string;
  scheduledAt: string;
  durationMinutes: number;
}

// Solo editable si status = 'disponible' (lo valida el backend); nunca
// studentId ni status, que cambian por acciones dedicadas.
export type UpdatePracticeSlotInput = Partial<{
  instructorId: string;
  scheduledAt: string;
  durationMinutes: number;
}>;

// Payloads de los eventos de Realtime (ver docs/adr/007 en el backend).
// slot-released es el único que trae slotId; los personales solo traen
// scheduledAt, así que el frontend reacciona haciendo refetch en vez de
// intentar aplicar el payload directamente.
export interface SlotReleasedPayload {
  slotId: string;
  scheduledAt: string;
}

export interface ConfirmationRequestedPayload {
  scheduledAt: string;
}

export interface NoPracticePayload {
  scheduledAt: string;
}
