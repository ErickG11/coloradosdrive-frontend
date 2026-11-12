export type NotificationType =
  | "contenido_habilitado"
  | "examen_habilitado"
  | "intento_extra"
  | "recordatorio_practica"
  | "espera_apertura"
  | "resultado_cancelacion"
  | "cupo_disponible"
  | "sin_practica_instructor"
  | "cambio_realizado"
  | "asistencia_corregida"
  | "encuesta_practica"
  | "documento_aprobado"
  | "documento_rechazado";

export interface Notification {
  attendanceEventId?: string | null;
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  practiceSlotId: string | null;
  scheduledAt: string | null;
  createdAt: string;
  readAt: string | null;
  emailStatus: "pendiente" | "enviado" | "fallido" | null;
  emailAttempts: number;
}

export interface NotificationsPage {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}
