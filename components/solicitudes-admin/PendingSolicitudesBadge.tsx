export function PendingSolicitudesBadge({ count }: { count: number }) {
  return count > 0 ? (
    <span
      className="ml-auto inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/40 bg-brand-primary px-1.5 py-0.5 text-xs leading-none font-bold text-white"
      aria-label={`${count} solicitudes pendientes`}
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}
