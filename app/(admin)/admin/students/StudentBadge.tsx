const labels: Record<string, string> = {
  activo: "Activo",
  finalizado: "Finalizado",
  retirado: "Retirado",
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
  return (
    <span className="inline-flex rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-text-secondary">
      {labels[status] ?? status}
    </span>
  );
}
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-accent-blue-subtle text-accent-blue" : "bg-accent-red-subtle text-accent-red"}`}
    >
      {active ? "Activo" : "Desactivado"}
    </span>
  );
}
