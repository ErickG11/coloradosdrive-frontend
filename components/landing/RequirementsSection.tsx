import type { ReactElement } from "react";

import styles from "./landing.module.css";

import { BallotIcon, BloodDropIcon, DiplomaIcon, IdCardIcon } from "./icons";
import { ScrollReveal } from "./ScrollReveal";

interface Requirement {
  icon: ReactElement;
  label: string;
}

// Contenido fijo (Fase 2): los mismos 4 requisitos para cualquier curso,
// no vienen de la API.
const REQUIREMENTS: Requirement[] = [
  { icon: <IdCardIcon className="h-6 w-6" />, label: "Cédula de identidad" },
  { icon: <BallotIcon className="h-6 w-6" />, label: "Papeleta de votación" },
  { icon: <BloodDropIcon className="h-6 w-6" />, label: "Certificado de tipo de sangre" },
  {
    icon: <DiplomaIcon className="h-6 w-6" />,
    label: "Título de bachiller o certificado de estudios hasta décimo año",
  },
];

export function RequirementsSection() {
  return (
    <section
      className={`${styles.container} ${styles.requirements}`}
      aria-labelledby="requirements-title"
    >
      <ScrollReveal>
        <h2 id="requirements-title">Requisitos para inscribirte</h2>
      </ScrollReveal>

      <div className={styles.requirementGrid}>
        {REQUIREMENTS.map((requirement, index) => (
          <ScrollReveal key={requirement.label} delay={index * 0.08}>
            <div className={styles.requirementItem}>
              <span className={styles.requirementNumber} aria-hidden="true">
                0{index + 1}
              </span>
              <div className={styles.requirementIcon}>{requirement.icon}</div>
              <span>{requirement.label}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
