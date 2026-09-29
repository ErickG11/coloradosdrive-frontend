"use client";

import { motion } from "motion/react";
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
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
