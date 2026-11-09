import { safeProgress } from "@/lib/utils/content";
import styles from "./subject-identity.module.css";

export function LearningProgress({
  value,
  complete,
  label,
}: {
  value: number;
  complete: boolean;
  label: string;
}) {
  const percent = safeProgress(value, complete);
  return (
    <div className={styles.progressGroup}>
      <div className={styles.progressLabel}>
        <span>{label}</span>
        <strong>
          {percent.toLocaleString("es-EC", { maximumFractionDigits: 2 })}%
          {complete ? " · Completa" : ""}
        </strong>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={styles.progressTrack}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
