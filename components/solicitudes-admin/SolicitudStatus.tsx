import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EstadoInscripcion } from "@/types/inscripcion";
import { ETIQUETA_ESTADO } from "./catalogo";

export function SolicitudStatus({ estado }: { estado: EstadoInscripcion }) {
  const state = ETIQUETA_ESTADO[estado];
  return (
    <StatusBadge status={estado} label={state?.label ?? estado} tone={state?.tone ?? "neutral"} />
  );
}
