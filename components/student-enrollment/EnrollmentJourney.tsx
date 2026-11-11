import type { CSSProperties } from "react";
import { longDate, type EnrollmentMilestone } from "./enrollmentModel";
import { EnrollmentIcon } from "./EnrollmentVisual";
import styles from "./enrollment-overview.module.css";

export function EnrollmentJourney({ milestones }: { milestones: EnrollmentMilestone[] }) {
  return (
    <section
      className={`${styles.journey} ${styles.enter}`}
      aria-labelledby="enrollment-journey-title"
    >
      <div className={styles.sectionTitle}>
        <h2 id="enrollment-journey-title">Ruta de tu inscripción</h2>
        <p>Lo que ya avanzaste, confirmado por la escuela.</p>
      </div>
      <ol className={styles.milestones}>
        {milestones.map((milestone, index) => (
          <li
            key={milestone.id}
            data-state={milestone.state}
            aria-current={milestone.state === "current" ? "step" : undefined}
            style={{ "--milestone-delay": `${Math.min(index, 7) * 28}ms` } as CSSProperties}
          >
            <span className={styles.milestoneIcon}>
              <EnrollmentIcon kind={milestone.state === "complete" ? "check" : milestone.icon} />
            </span>
            <div>
              <strong>{milestone.label}</strong>
              {milestone.date && longDate(milestone.date) ? (
                <time dateTime={milestone.date}>{longDate(milestone.date)}</time>
              ) : null}
              <span className="sr-only">
                {milestone.state === "complete"
                  ? "Completado"
                  : milestone.state === "current"
                    ? "Estado actual"
                    : "Próximo"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
