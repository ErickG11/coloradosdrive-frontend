import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { StudentPendingRatings } from "@/components/practice-ratings/StudentPendingRatings";

export const metadata: Metadata = { title: "Panel de estudiante" };

// Mismo círculo decorativo que el home de admin (posición/tamaño/color),
// para consistencia visual entre los 3 paneles de rol.
export default function StudentPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-accent-blue/20 blur-3xl"
      />
      <Card title="Panel de estudiante" titleAs="h1" className="relative z-10">
        <p className="text-sm text-text-secondary">
          Consulta tus prácticas y las horas que has asistido. Son las que cuentan para
          certificarte.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/student/history" className={buttonClassName()}>
            Ver mi historial de asistencia
          </Link>
          <Link href="/student/schedule" className={buttonClassName("secondary")}>
            Ver mis horarios
          </Link>
        </div>
      </Card>
      <Suspense
        fallback={
          <Card title="Encuestas pendientes" className="relative z-10 mt-5">
            <p className="text-sm text-text-secondary">Cargando encuestas…</p>
          </Card>
        }
      >
        <StudentPendingRatings />
      </Suspense>
    </div>
  );
}
