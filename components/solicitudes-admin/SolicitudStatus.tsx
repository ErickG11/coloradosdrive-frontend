import { StatusBadge } from "@/components/ui/StatusBadge";

const STATES: Record<
  string,
  { label: string; tone: "warning" | "success" | "error" | "info" | "neutral" }
> = {
  obligatorios_presentes: { label: "Documentos obligatorios presentes", tone: "success" },
  obligatorios_incompletos: { label: "Documentos obligatorios incompletos", tone: "warning" },
  pendiente_revision: { label: "Pendiente de revisión", tone: "warning" },
  aprobada: { label: "Aprobada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "error" },
  recibido: { label: "Pendiente de revisión", tone: "info" },
  aprobado: { label: "Aprobado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "error" },
  faltante: { label: "Faltante", tone: "warning" },
  no_aplica: { label: "No aplica", tone: "neutral" },
};
export function SolicitudStatus({ estado }: { estado: string }) {
  const state = STATES[estado];
  return (
    <StatusBadge status={estado} label={state?.label ?? estado} tone={state?.tone ?? "neutral"} />
  );
}
