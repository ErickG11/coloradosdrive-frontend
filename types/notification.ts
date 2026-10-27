export type NotificationType =
  | "recordatorio_practica"
  | "resultado_cancelacion"
  | "cupo_disponible"
  | "sin_practica_instructor"
  | "cambio_realizado";

export interface Notification {
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
