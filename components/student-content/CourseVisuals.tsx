"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useContentSuccess } from "@/components/content-admin/ContentFeedback";
import { safeProgress } from "@/lib/utils/content";
import type { CourseProgress } from "@/types/content";
import styles from "./student-learning.module.css";

export { subjectTone, visualTitle, LearningIcon } from "@/components/learning/SubjectIdentity";

export function ScoreRing({
  value,
  label = "Nota",
  large = false,
}: {
  value: number | null;
  label?: string;
  large?: boolean;
}) {
  const fill = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div
      className={`${styles.scoreRing} ${large ? styles.scoreRingLarge : ""}`}
      role="img"
      aria-label={`${label}: ${value == null ? "pendiente" : `${value}%`}`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="43" className={styles.ringTrack} />
        <circle
          cx="50"
          cy="50"
          r="43"
          className={styles.ringValue}
          pathLength="100"
          strokeDasharray={`${fill} 100`}
        />
      </svg>
      <span>
        <strong>
          {value == null ? "—" : `${value.toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`}
        </strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

export function CourseRoad({ progress }: { progress: CourseProgress }) {
  const reduced = useReducedMotion();
  const notify = useContentSuccess();
  const flags = useRef<HTMLDivElement>(null);
  const previous = useRef<Record<string, boolean> | null>(null);
  const percent = safeProgress(progress.global, progress.completa);
  const position = progress.completa ? 100 : Math.min(97, percent);
  const subjects = progress.materias.filter((subject) => subject.obligatorios_totales > 0);
  useEffect(() => {
    const before = previous.current;
    previous.current = Object.fromEntries(
      subjects.map((subject) => [subject.subject_id, subject.completa]),
    );
    if (!before) return;
    for (const subject of subjects) {
      if (before[subject.subject_id] === false && subject.completa) {
        notify(`¡Materia completada: ${subject.title}!`);
        const node = flags.current?.querySelector<HTMLElement>(
          `[data-milestone="${subject.subject_id}"]`,
        );
        if (!reduced)
          node?.animate(
            [
              { filter: "brightness(1)", boxShadow: "0 0 0 0 transparent" },
              { filter: "brightness(1.2)", boxShadow: "0 0 0 8px var(--color-status-success-bg)" },
              { filter: "brightness(1)", boxShadow: "0 0 0 0 transparent" },
            ],
            { duration: 650, easing: "ease-out" },
          );
      }
    }
  }, [subjects, notify, reduced]);
  const transition = { duration: reduced ? 0 : 1, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <div className={styles.roadWrap}>
      <div
        ref={flags}
        role="progressbar"
        aria-label="Tu camino en el curso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% del curso completado`}
        className={styles.road}
      >
        <div className={styles.asphalt} aria-hidden="true" />
        {subjects.map((subject, index) => (
          <div
            key={subject.subject_id}
            data-milestone={subject.subject_id}
            title={`${subject.title}: ${subject.completa ? "completa" : "pendiente"}`}
            aria-hidden="true"
            className={`${styles.milestone} ${subject.completa ? styles.milestoneDone : ""}`}
            style={{ left: `${((index + 1) / subjects.length) * 100}%` }}
          >
            {index < subjects.length - 1 ? (
              <>
                <span className={styles.flag}>{subject.completa ? "✓" : index + 1}</span>
                <i />
              </>
            ) : null}
          </div>
        ))}
        <div className={styles.finish} aria-hidden="true">
          <span />
          <i />
          <small>Meta</small>
        </div>
        <motion.div
          initial={false}
          animate={{ left: `calc(${position}% - ${progress.completa ? 0 : position * 0.4}px)` }}
          transition={transition}
          className={styles.car}
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 56" fill="none">
            <path
              d="m13 29 11-16c2-3 5-4 9-4h28c5 0 8 2 11 5l12 15 9 5v12H7V34l6-5Z"
              fill="var(--color-brand-primary)"
              stroke="var(--car-outline)"
              strokeWidth="2"
            />
            <path
              d="m27 17-8 13h27V16H32c-2 0-4 0-5 1Zm25-1v14h25l-9-11c-1-2-4-3-7-3h-9Z"
              fill="var(--car-window)"
            />
            <path d="M12 39h7m63-3h9M54 35h7" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            {[27, 76].map((x) => (
              <g key={x} transform={`translate(${x} 44)`}>
                <motion.g
                  initial={false}
                  animate={{ rotate: reduced ? 0 : position * 20 }}
                  transition={transition}
                  style={{ originX: 0.5, originY: 0.5 }}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill="#20252f"
                    stroke="var(--car-outline)"
                    strokeWidth="2"
                  />
                  <circle cx="0" cy="0" r="5" fill="#dce3ed" />
                  <path d="M-4 0h8m-4-4v8" stroke="#657184" strokeWidth="1.5" />
                </motion.g>
              </g>
            ))}
          </svg>
        </motion.div>
        <span className={styles.startLabel} aria-hidden="true">
          Inicio
        </span>
      </div>
    </div>
  );
}

export function SubjectEmpty() {
  return (
    <div className={styles.empty}>
      <svg width="110" height="82" viewBox="0 0 110 82" fill="none" aria-hidden="true">
        <path d="M5 68h100M28 64V22h54v42M35 22V13h40v9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M41 37h28m-28 9h20m-20 9h25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="84"
          cy="25"
          r="14"
          fill="var(--color-bg-surface)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M84 18v14m-7-7h14" stroke="currentColor" strokeWidth="2" />
      </svg>
      <h3>Estamos preparando esta parada</h3>
      <p>Los materiales publicados aparecerán aquí. Puedes seguir explorando las otras materias.</p>
    </div>
  );
}
