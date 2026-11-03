export function PendingSolicitudesBadge({ count }: { count: number }) {
  return count > 0 ? (
    <span
      className="ml-auto rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-ink"
      aria-label={`${count} solicitudes pendientes`}
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}
