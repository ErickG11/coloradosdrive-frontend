"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// reducedMotion="user": toda animación de la landing (ScrollReveal, hover de
// tarjetas, hero) respeta prefers-reduced-motion sin repetir el guard en
// cada componente — un solo punto de control para la sección pública.
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
