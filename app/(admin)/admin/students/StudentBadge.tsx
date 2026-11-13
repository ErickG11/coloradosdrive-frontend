import { StatusBadge } from "@/components/ui/StatusBadge";

const labels: Record<string, string> = {
  activo: "Activo",
  por_agendar: "Por agendar",
  reservado: "Reservado",
  pago_pendiente: "Pago pendiente",
  finalizado: "Finalizado",
  retirado: "Retirado",
  anulada: "Anulada",
  pendiente_cohorte: "Pendiente de cohorte",
  pendiente_verificacion: "Pendiente de verificación",
  verificado: "Verificado",
  pagado_esperando_cohorte: "Pagado, esperando cohorte",
  rechazado: "Rechazado",
  expirado: "Expirado",
  entregado: "Entregado",
  pendiente: "Pendiente",
  no_aplica: "No aplica",
};
export function StudentBadge({ status }: { status: string }) {
  return <StatusBadge status={status}>{labels[status] ?? status}</StatusBadge>;
}
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <StatusBadge status={active ? "activo" : "inactivo"}>
      {active ? "Activo" : "Inactivo"}
    </StatusBadge>
  );
}
