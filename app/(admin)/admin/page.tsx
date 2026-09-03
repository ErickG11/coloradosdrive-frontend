import Link from "next/link";

import { Card } from "@/components/ui";

// Panel raíz simple a propósito: sin KPIs ni gráficas (RF-08 es Sprint 7,
// se construye ahí con datos reales). Los enlaces duplican los del Sidebar
// a propósito, como bienvenida — no son la navegación principal.
export default function AdminPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-accent-blue/10 blur-3xl"
      />
      <Card title="Panel de administrador" className="relative z-10">
        <nav className="flex flex-col gap-2 text-sm">
          <Link
            href="/admin/cohorts"
            className="text-accent-blue underline underline-offset-2 hover:text-accent-blue-hover"
          >
            Cohortes
          </Link>
          <Link
            href="/admin/enrollments"
            className="text-accent-blue underline underline-offset-2 hover:text-accent-blue-hover"
          >
            Matricular estudiante
          </Link>
        </nav>
      </Card>
    </div>
  );
}
