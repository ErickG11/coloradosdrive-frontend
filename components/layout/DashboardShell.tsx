import type { ReactNode } from "react";

import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";

import { Sidebar } from "./Sidebar";

interface DashboardShellProps {
  children: ReactNode;
}

// Shell compartido por los paneles de admin/estudiante/instructor: sidebar
// con el usuario y rol actuales, más el contenido de cada ruta protegida.
// Columna en móvil (topbar del Sidebar arriba, contenido abajo); fila desde
// 768px (Sidebar fijo a la izquierda, contenido a la derecha) — el propio
// Sidebar decide qué de sus dos variantes (topbar/aside) se muestra según
// el breakpoint.
export async function DashboardShell({ children }: DashboardShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Sidebar email={user?.email ?? null} role={getUserRole(user)} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
