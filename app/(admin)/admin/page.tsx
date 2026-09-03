import Link from "next/link";

import { Card } from "@/components/ui";

export default function AdminPage() {
  return (
    <Card title="Panel de administrador">
      <nav className="flex flex-col gap-2 font-sans text-sm">
        <Link
          href="/admin/cohorts"
          className="text-text-primary underline decoration-border underline-offset-2 transition-colors hover:text-accent-blue hover:decoration-accent-blue"
        >
          Cohortes
        </Link>
        <Link
          href="/admin/enrollments"
          className="text-text-primary underline decoration-border underline-offset-2 transition-colors hover:text-accent-blue hover:decoration-accent-blue"
        >
          Matricular estudiante
        </Link>
      </nav>
    </Card>
  );
}
