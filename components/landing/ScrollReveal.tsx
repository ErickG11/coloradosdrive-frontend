"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Retraso en segundos, para escalonar secciones vecinas. */
  delay?: number;
  variant?: "rise" | "media";
}

// Envoltorio compartido para "aparición progresiva al hacer scroll" (pedido
// explícito de la Fase 2): fade + subtle translate-y, una sola vez por
// sección (whileInView + viewport once), nunca en loop. El respeto a
// prefers-reduced-motion se resuelve una sola vez arriba, en MotionRoot.
export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "rise",
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={
        reducedMotion
          ? undefined
          : variant === "media"
            ? { opacity: [0.65, 1], scale: [0.985, 1] }
            : { opacity: [0, 1], y: [14, 0] }
      }
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: variant === "media" ? 0.6 : 0.46,
        delay: reducedMotion ? 0 : Math.min(delay, 0.18),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
