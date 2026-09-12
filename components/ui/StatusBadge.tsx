import { cn } from "@/lib/utils/cn";
import type { PracticeSlotStatus } from "@/types";

const STATUS_LABELS: Record<PracticeSlotStatus, string> = {
  disponible: "Disponible",
  asignado: "Asignado",
  confirmado: "Confirmado",
  liberado: "Liberado",
  sin_practica: "Sin práctica",
  completado: "Completado",
};

// La paleta se mantiene cerrada a accent-red/accent-blue + neutros (ver
// components/ui/Button.tsx): un badge de 6 estados no puede inventar
// colores nuevos, así que se agrupan por significado. disponible/asignado
// (neutro: todavía no hay un desenlace); confirmado/completado (accent-blue:
// resuelto positivamente); liberado/sin_practica (accent-red: requiere
// atención o no hubo práctica).
const STATUS_CLASSES: Record<PracticeSlotStatus, string> = {
  disponible: "bg-bg-sunken text-text-secondary",
  asignado: "bg-bg-sunken text-text-primary",
  confirmado: "bg-accent-blue-subtle text-accent-blue",
  completado: "bg-accent-blue-subtle text-accent-blue",
  liberado: "bg-accent-red-subtle text-accent-red",
  sin_practica: "bg-accent-red-subtle text-accent-red",
};

export interface StatusBadgeProps {
  status: PracticeSlotStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
