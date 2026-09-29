// Íconos propios de la landing pública (mismo estilo que
// components/ui/icons.tsx: 20x20, fill="none", stroke="currentColor",
// strokeWidth 1.5) — no van al set global porque solo se usan acá.

interface IconProps {
  className?: string;
}

export function MotorcycleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 14.5 8 9h3l2 3.5h2M8 9 6.5 6.5h-2M11 9l1.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 13.2v-2.4L5 7.3A1.5 1.5 0 0 1 6.4 6.4h7.2A1.5 1.5 0 0 1 15 7.3l1.5 3.5v2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.3 10.8h13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M3.5 13.2h13v1a1 1 0 0 1-1 1h-.5a1 1 0 0 1-1-1v-.3h-8v.3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IdCardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect
        x="2.5"
        y="4.5"
        width="15"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="7" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 13c.4-1.2 1.4-2 2.5-2s2.1.8 2.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12.5 8h4M12.5 10.5h4M12.5 13h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BallotIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 3.5h6.5L15 6v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 3.5V6h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M7 10.5 8.5 12l3-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BloodDropIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 3s5 5.6 5 9a5 5 0 1 1-10 0c0-3.4 5-9 5-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 12.2A2.3 2.3 0 0 0 10 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DiplomaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3.5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 6.5h9M5.5 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M8.5 13.5 8 17l2-1.2 2 1.2-.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
