import type { User as SupabaseUser } from "@supabase/supabase-js";

import { isRole, type Role } from "@/types/user";

// El rol de negocio (admin/estudiante/instructor) vive en el claim
// personalizado app_metadata.role del JWT de Supabase Auth — el mismo
// lugar que usa el backend (ver coloradosdrive-backend
// src/middlewares/auth.middleware.ts).
export function getUserRole(user: SupabaseUser | null | undefined): Role | null {
  const role: unknown = user?.app_metadata?.role;
  return isRole(role) ? role : null;
}
