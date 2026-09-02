export const ROLES = ["admin", "estudiante", "instructor"] as const;

export type Role = (typeof ROLES)[number];

// Refleja la tabla `users` del backend (coloradosdrive-backend/migrations/001_init.sql).
export interface User {
  id: string;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  rol: Role;
  createdAt: string;
  updatedAt: string;
}
