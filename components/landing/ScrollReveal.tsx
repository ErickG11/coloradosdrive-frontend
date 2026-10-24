"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Retraso en segundos, para escalonar secciones vecinas. */
  delay?: number;
}

// Envoltorio compartido para "aparición progresiva al hacer scroll" (pedido
// explícito de la Fase 2): fade + subtle translate-y, una sola vez por
// sección (whileInView + viewport once), nunca en loop. El respeto a
// prefers-reduced-motion se resuelve una sola vez arriba, en MotionRoot.
export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reducedMotion ? undefined : { opacity: [0.35, 1], y: [24, 0] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.28, delay: reducedMotion ? 0 : delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
