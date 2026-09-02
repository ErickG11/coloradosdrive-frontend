import type { ReactNode } from "react";

import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";

import { Navbar } from "./Navbar";

interface DashboardShellProps {
  children: ReactNode;
}

// Shell compartido por los paneles de admin/estudiante/instructor: navbar
// con el usuario y rol actuales, más el contenido de cada ruta protegida.
export async function DashboardShell({ children }: DashboardShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar email={user?.email ?? null} role={getUserRole(user)} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
