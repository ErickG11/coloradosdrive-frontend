import { CheckIcon, XIcon } from "@/components/ui/icons";
import type { VisualState } from "./scheduleModel";
import styles from "./schedule.module.css";

export function ScheduleIcon({
  kind = "calendar",
  className,
}: {
  kind?: "calendar" | "clock" | "info" | "more";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? styles.icon}
    >
      {kind === "calendar" ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2" />
        </>
      ) : kind === "clock" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      ) : kind === "info" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6m0-10v.1" />
        </>
      ) : (
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      )}
    </svg>
  );
}
export function PracticeBadge({ state }: { state: VisualState }) {
  return (
    <span
      className={styles.badge}
      data-tone={state.tone}
      data-cancelled={state.cancelled || undefined}
    >
      {state.tone === "live" ? <span className={styles.liveDot} aria-hidden="true" /> : null}
      {state.icon === "check" ? (
        <CheckIcon className={styles.smallIcon} />
      ) : state.icon === "cross" ? (
        <XIcon className={styles.smallIcon} />
      ) : (
        <ScheduleIcon kind="clock" className={styles.smallIcon} />
      )}
      {state.label}
    </span>
  );
}
export function ScheduleSkeleton() {
  return (
    <div className={styles.layout} role="status" aria-label="Cargando tus prácticas">
      <div className={styles.main}>
        <div className={`${styles.skeleton} ${styles.heroSkeleton}`} />
        {[1, 2, 3].map((id) => (
          <div key={id} className={`${styles.skeleton} ${styles.rowSkeleton}`} />
        ))}
      </div>
      <div className={`${styles.skeleton} ${styles.planSkeleton}`} />
    </div>
  );
}
