import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<string, string> = {
  disponible: "Disponible",
  asignado: "Asignado",
  confirmado: "Confirmado",
  liberado: "Liberado",
  sin_practica: "Sin práctica",
  completado: "Completado",
  activo: "Activo",
  inactivo: "Inactivo",
  pendiente: "Pendiente",
  pendiente_cohorte: "Sin cohorte",
  error: "Error",
};
export type StatusTone = "success" | "warning" | "info" | "error" | "neutral";
const CLASSES: Record<StatusTone, string> = {
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  info: "bg-status-info-bg text-status-info",
  error: "bg-status-error-bg text-status-error",
  neutral: "bg-status-neutral-bg text-status-neutral",
};
function toneFor(status: string): StatusTone {
  if (["activo", "confirmado", "completado", "verificado", "entregado"].includes(status))
    return "success";
  if (
    [
      "pendiente",
      "pendiente_eliminacion",
      "eliminacion_pendiente",
      "pendiente_cohorte",
      "pendiente_verificacion",
      "pagado_esperando_cohorte",
      "liberado",
      "sin_practica",
    ].includes(status)
  )
    return "warning";
  if (["error", "rechazado", "fallido"].includes(status)) return "error";
  return "neutral";
}
export interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  children?: ReactNode;
  className?: string;
}
export function StatusBadge({ status, tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs leading-4 font-semibold",
        CLASSES[tone ?? toneFor(status)],
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children ?? LABELS[status] ?? status}
    </span>
  );
}
