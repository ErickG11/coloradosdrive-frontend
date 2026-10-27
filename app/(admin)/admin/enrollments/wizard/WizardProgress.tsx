"use client";
import { WIZARD_STEPS, type WizardStep } from "./wizardTypes";
import { STEP_LABELS, WizardIcon } from "./WizardVisual";
import styles from "./enrollment.module.css";

// Indicador de los cinco pasos. La navegación permanece en Atrás/Continuar.
export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  return (
    <nav className={styles.progress} aria-label="Progreso de matrícula">
      <p className={styles.progressSummary} aria-live="polite">
        Paso {currentStep} de 5 <span>{STEP_LABELS[currentStep - 1]}</span>
      </p>
      <ol>
        {WIZARD_STEPS.map((step) => (
          <li
            key={step}
            aria-current={step === currentStep ? "step" : undefined}
            data-done={step < currentStep}
          >
            <span className={styles.stepNumber}>
              {step < currentStep ? (
                <>
                  <WizardIcon name="check" />
                  <span className="sr-only">Completado</span>
                </>
              ) : (
                step
              )}
            </span>
            <span className={styles.stepLabel}>
              {step === 4 ? (
                <>
                  <span className={styles.longStepLabel}>{STEP_LABELS[step - 1]}</span>
                  <span className={styles.shortStepLabel} aria-hidden="true">
                    Docs. y pago
                  </span>
                </>
              ) : (
                STEP_LABELS[step - 1]
              )}
            </span>
            {step < 5 && (
              <span className={styles.connector} aria-hidden="true">
                <i />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
