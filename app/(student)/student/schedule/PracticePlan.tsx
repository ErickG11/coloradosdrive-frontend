"use client";

import { useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";
import { hoursLabel, type VisualState } from "./scheduleModel";
import { ScheduleIcon } from "./ScheduleVisual";
import styles from "./schedule.module.css";

export function PracticePlan({
  history,
  assignedMinutes,
  remainingPractices,
  practiceStates,
  remainingChanges,
  invalidPlan,
  loading,
  error,
  onRetry,
}: {
  history: PracticeHistoryPage | null;
  assignedMinutes: number;
  remainingPractices: number;
  practiceStates: VisualState[];
  remainingChanges: number | null;
  invalidPlan: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const gradientId = `practice-progress-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const summary = history?.summary;
  const target = summary?.horasObjetivo;
  const hasTarget =
    !invalidPlan && typeof target === "number" && Number.isFinite(target) && target > 0;
  const denominator = hasTarget ? target : assignedMinutes / 60;
  const attended = summary?.horasAsistidas ?? null;
  const progress =
    attended !== null && denominator > 0 ? Math.max(0, Math.min(1, attended / denominator)) : null;
  const ringDescription =
    attended === null
      ? `Asistencia aún no disponible; ${hoursLabel(assignedMinutes)} asignadas`
      : `${hoursLabel(attended * 60)} de ${hoursLabel(denominator * 60)} ${hasTarget ? "objetivo" : "asignadas"}`;
  return (
    <aside className={styles.rail} aria-label="Resumen de mi plan">
      <section className={styles.plan}>
        <h2>Mi plan</h2>
        {loading ? (
          <div
            className={`${styles.skeleton} ${styles.progressSkeleton}`}
            aria-label="Cargando avance"
          />
        ) : (
          <div className={styles.progressSummary}>
            <div
              className={styles.ring}
              role={progress !== null ? "progressbar" : "img"}
              aria-label={hasTarget ? "Avance de horas asistidas" : "Asistencia y horas asignadas"}
              aria-valuemin={progress !== null ? 0 : undefined}
              aria-valuemax={progress !== null ? denominator : undefined}
              aria-valuenow={
                progress !== null && attended !== null
                  ? Math.max(0, Math.min(attended, denominator))
                  : undefined
              }
              aria-valuetext={progress !== null ? ringDescription : undefined}
              title={ringDescription}
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--agenda-action-mark)" />
                    <stop offset="100%" stopColor="var(--color-brand-ink)" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="43" className={styles.ringTrack} />
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  className={styles.ringValue}
                  stroke={`url(#${gradientId})`}
                  strokeDasharray={`${(progress ?? 0) * 270.18} 270.18`}
                  transform="rotate(-90 50 50)"
                  style={{ opacity: progress !== null && progress > 0 ? 1 : 0 }}
                />
              </svg>
              <strong>
                {progress === null ? "—" : Math.round(progress * 100)}
                {progress !== null ? <small>%</small> : null}
              </strong>
            </div>
            <div>
              <p className={styles.planValue}>
                {attended === null ? "Sin registro" : hoursLabel(attended * 60)}
                <span>
                  de {hoursLabel(denominator * 60)} {hasTarget ? "objetivo" : "asignadas"}
                </span>
              </p>
              <p className={styles.hint}>
                {hasTarget ? "Horas asistidas" : "Asistencia / agenda asignada"}
              </p>
            </div>
          </div>
        )}
        {error ? (
          <div className={styles.inlineError}>
            <p>{error}</p>
            <Button variant="ghost" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : null}
        <dl className={styles.planFacts}>
          <div className={styles.remainingFact}>
            <dt>Prácticas por asistir</dt>
            <dd>
              <strong className={styles.remainingNumber}>{remainingPractices}</strong>
              <span>prácticas reservadas</span>
            </dd>
            <div
              className={styles.practiceSegments}
              role="img"
              aria-label={`${remainingPractices} prácticas: ${practiceStates.map((state) => state.label).join(", ") || "sin reservas"}`}
            >
              {practiceStates.map((state, index) => (
                <span
                  key={index}
                  className={styles.practiceSegment}
                  data-tone={state.tone}
                  title={`Práctica ${index + 1}: ${state.label}`}
                />
              ))}
            </div>
          </div>
          <div>
            <dt>Reprogramaciones</dt>
            <dd>
              {remainingChanges !== null ? (
                <>
                  <span className={styles.pips} aria-hidden="true">
                    {[0, 1].map((index) => (
                      <i key={index} data-available={index < remainingChanges || undefined} />
                    ))}
                  </span>
                  Te quedan {remainingChanges} de 2
                </>
              ) : (
                <span className={styles.unknownCount}>
                  <ScheduleIcon kind="info" className={styles.smallIcon} />
                  Disponibilidad por confirmar
                </span>
              )}
            </dd>
          </div>
        </dl>
        <p className={styles.hint}>Solo las horas asistidas cuentan para tu certificación.</p>
        <Link href="/student/history" className={styles.textLink}>
          Ver mi historial completo
        </Link>
      </section>
      <details className={styles.rules}>
        <summary>Reglas de reprogramación</summary>
        <ul>
          <li>Hasta 2 reprogramaciones por matrícula.</li>
          <li>Elige un motivo y explícalo en al menos 10 caracteres.</li>
          <li>El cambio normal cierra 5 minutos antes de la práctica.</li>
          <li>El nuevo horario debe estar dentro de la fecha fin de tu plan.</li>
          <li>No puedes retomar un cupo que tú liberaste.</li>
        </ul>
        <p>La vista previa te explica la consecuencia antes de confirmar.</p>
      </details>
    </aside>
  );
}
