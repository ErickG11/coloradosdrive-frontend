import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EnrollmentBrand, EnrollmentIcon } from "./EnrollmentVisual";
import styles from "./enrollment-flow.module.css";
export const NEXT_STEPS = [
  "Revisión de tu solicitud",
  "Correo de aprobación",
  "Elige tu horario",
  "Pago",
  "¡A manejar!",
];
export function EnrollmentNextSteps() {
  return (
    <ol className={styles.timeline}>
      {NEXT_STEPS.map((label, index) => (
        <li key={label}>
          <span aria-hidden="true">{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
export function FlowStepIcon({ step }: { step: number }) {
  return (
    <span className={styles.icon}>
      <EnrollmentIcon
        name={(["document", "mail", "key", "shield", "users", "study", "check"] as const)[step % 7]}
      />
    </span>
  );
}
export function EnrollmentFlowFrame({
  children,
  step = 1,
  total = 7,
  student = false,
  companion = true,
}: {
  children: ReactNode;
  step?: number;
  total?: number;
  student?: boolean;
  companion?: boolean;
}) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <EnrollmentBrand />
        <Link href="/">Volver al inicio</Link>
        <ThemeToggle />
      </header>
      <div className={`${styles.layout} ${!companion ? styles.fullWidth : ""}`}>
        {companion ? (
          <aside className={styles.companion} aria-label="Tu inscripción">
            <div className={styles.intro}>
              <span className={styles.icon}>
                <EnrollmentIcon name="shield" />
              </span>
              <h2>Tu inscripción</h2>
              <p>
                {student
                  ? "Tu próximo paso hacia el volante."
                  : "Empieza tu camino. Te tomará unos 5 minutos."}
              </p>
            </div>
            {!student ? (
              <section>
                <h3>Ten a la mano</h3>
                <ul className={styles.needs}>
                  <li>✓ Tu documento de identidad</li>
                  <li>✓ Un correo al que puedas acceder</li>
                  <li>✓ Certificado de estudios, si aplica</li>
                </ul>
              </section>
            ) : null}
            <section>
              <h3>Qué sigue</h3>
              <EnrollmentNextSteps />
            </section>
            <p className={styles.security}>
              <EnrollmentIcon name="shield" /> Tus datos se usan para gestionar tu inscripción y se
              tratan según el aviso de privacidad.
            </p>
          </aside>
        ) : null}
        <div className={styles.mobileIntro}>
          <p>
            Paso {Math.min(step, total)} de {total}
            {!student ? " · unos 5 min" : ""}
          </p>
          {companion ? (
            <details>
              <summary>Qué sigue</summary>
              <EnrollmentNextSteps />
            </details>
          ) : null}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
