import { Card } from "@/components/ui";

// Mismo círculo decorativo que el home de admin (posición/tamaño/color),
// para consistencia visual entre los 3 paneles de rol.
export default function StudentPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-accent-blue/20 blur-3xl"
      />
      <Card title="Panel de estudiante" className="relative z-10">
        <p className="text-sm text-text-secondary">Próximamente.</p>
      </Card>
    </div>
  );
}
