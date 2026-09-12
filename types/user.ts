export const ROLES = ["admin", "estudiante", "instructor"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

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

// Forma que devuelve GET /users?rol=<rol> (admin-only): solo lo mínimo
// para poblar un selector, ej. instructores al crear una franja.
export interface UserSummary {
  id: string;
  nombreCompleto: string;
}
