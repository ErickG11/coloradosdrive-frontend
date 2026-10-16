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
    <div className="flex min-h-full min-w-0 flex-1 flex-col md:flex-row">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar email={user?.email ?? null} role={getUserRole(user)} />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
        <div className="mx-auto w-full min-w-0 max-w-[var(--content-max)]">{children}</div>
      </main>
    </div>
  );
}
