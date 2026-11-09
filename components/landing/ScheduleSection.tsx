import styles from "./landing.module.css";

import { ClockIcon } from "./icons";
import { ScrollReveal } from "./ScrollReveal";

// Horario fijo (Fase 2): igual para todos los días, no viene de la API.
export function ScheduleSection() {
  return (
    <section
      className={`${styles.container} ${styles.scheduleSection}`}
      aria-labelledby="schedule-title"
    >
      <ScrollReveal>
        <div className={styles.scheduleBand}>
          <div className={styles.scheduleIcon}>
            <ClockIcon className="h-7 w-7" />
          </div>
          <div>
            <h2 id="schedule-title">Horario de prácticas</h2>
            <p>Todos los días, de 06:00 a 22:00.</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
