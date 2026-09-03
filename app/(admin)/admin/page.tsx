import Link from "next/link";

import { Card } from "@/components/ui";

export default function AdminPage() {
  return (
    <Card title="Panel de administrador">
      <nav className="flex flex-col gap-2 text-sm">
        <Link href="/admin/cohorts" className="text-zinc-900 underline underline-offset-2">
          Cohortes
        </Link>
        <Link href="/admin/enrollments" className="text-zinc-900 underline underline-offset-2">
          Matricular estudiante
        </Link>
      </nav>
    </Card>
  );
}
