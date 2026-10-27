"use client";
import { motion, useReducedMotion } from "motion/react";
export function CohortMetricValue({ value }: { value: number | null | undefined }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      key={String(value)}
      initial={reduced ? false : { opacity: 0.4, transform: "translateY(4px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: reduced ? 0 : 0.24, ease: [0.23, 1, 0.32, 1] }}
    >
      {value === undefined ? "…" : value === null ? "—" : value}
    </motion.span>
  );
}
