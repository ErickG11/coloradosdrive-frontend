"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

import { WIZARD_STEPS, type WizardStep } from "./wizardTypes";

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Estudiante",
  2: "Curso",
  3: "Prácticas",
  4: "Documentos y pago",
  5: "Confirmar",
};

interface WizardProgressProps {
  currentStep: WizardStep;
}

// Indicador 1-2-3-4: un paso queda "hecho" (check, azul) en cuanto se avanza
// más allá de él, nunca se puede retroceder saltando pasos intermedios
// desde acá (la navegación real vive en los botones Atrás/Continuar de cada
// paso, esto es solo indicador visual).
export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <ol className="mb-8 flex items-start gap-1 sm:gap-2">
      {WIZARD_STEPS.map((step, index) => {
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <li key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isDone && "border-accent-blue bg-accent-blue text-white",
                  isActive && "border-accent-blue text-accent-blue",
                  !isDone && !isActive && "border-border text-text-disabled",
                )}
              >
                {isDone ? (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                    <path
                      d="M4 10.5 8 14.5 16 5.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step
                )}
              </motion.div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isActive ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 ? (
              <div className="mb-5 h-px flex-1 bg-border sm:mb-6">
                <motion.div
                  className="h-px bg-accent-blue"
                  initial={false}
                  animate={{ width: isDone ? "100%" : "0%" }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
