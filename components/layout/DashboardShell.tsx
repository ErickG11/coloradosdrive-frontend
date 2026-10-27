import type { ReactNode } from "react";

import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
  const role = getUserRole(user);
  const hasNotifications = role === "estudiante" || role === "instructor";

  return (
    <div className="relative flex min-h-full min-w-0 flex-1 flex-col md:flex-row">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar email={user?.email ?? null} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        {hasNotifications ? (
          <header
            aria-label="Avisos de prácticas"
            className="absolute right-16 top-2.5 z-40 flex h-11 items-center md:static md:h-16 md:shrink-0 md:justify-end md:border-b md:border-border md:bg-bg-surface md:px-6"
          >
            <NotificationBell key={user?.id} role={role} />
          </header>
        ) : null}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <div className="mx-auto w-full min-w-0 max-w-[var(--content-max)]">{children}</div>
        </main>
      </div>
    </div>
  );
}
