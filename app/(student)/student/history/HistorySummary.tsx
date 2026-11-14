"use client";
import { useId } from "react";
import { CheckIcon } from "@/components/ui/icons";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";
import { AnimatedNumber, HistoryIcon } from "./HistoryVisual";
import { hours } from "./historyModel";
import styles from "./history.module.css";

export function HistorySummary({
  summary,
  scheduledMinutes,
  upcomingCount,
}: {
  summary: PracticeHistoryPage["summary"];
  scheduledMinutes: number | null;
  upcomingCount: number | null;
}) {
  const gradientId = `history-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const target = summary.horasObjetivo;
  const validTarget = target !== null && Number.isFinite(target) && target > 0;
  const progress = validTarget ? Math.max(0, Math.min(1, summary.horasAsistidas / target)) : 0;
  const scheduled = scheduledMinutes === null ? null : scheduledMinutes / 60;
  const canSegment = validTarget && scheduled !== null;
  const unplanned = canSegment ? Math.max(0, target - summary.horasAsistidas - scheduled) : null;
  const attendedPart = validTarget ? Math.min(summary.horasAsistidas, target) / target : 0;
  const scheduledPart = canSegment
    ? Math.min(scheduled, Math.max(0, target - summary.horasAsistidas)) / target
    : 0;
  const rateBase = summary.horasAsistidas + summary.horasPerdidas;
  const milestone =
    progress >= 1
      ? "Completaste tus horas de práctica"
      : progress >= 0.75
        ? "Ya recorriste tres cuartas partes de tus horas"
        : progress >= 0.5
          ? "Vas por la mitad"
          : progress >= 0.25
            ? "Ya completaste el primer cuarto de tus horas"
            : summary.horasAsistidas > 0
              ? "Cada práctica asistida suma a tu camino"
              : "Tu camino comienza con la primera práctica asistida";
  return (
    <>
      <section className={styles.hero} aria-labelledby="history-progress-title">
        <div className={styles.heroIntro}>
          <h2 id="history-progress-title">Tu camino a la certificación</h2>
          <p>Una vista clara de las horas que ya cuentan y las que vienen.</p>
        </div>
        <div className={styles.heroBody}>
          <div
            className={styles.progressRing}
            role={validTarget ? "progressbar" : "img"}
            aria-label="Progreso de horas asistidas"
            aria-valuemin={validTarget ? 0 : undefined}
            aria-valuemax={validTarget ? target : undefined}
            aria-valuenow={
              validTarget ? Math.max(0, Math.min(summary.horasAsistidas, target)) : undefined
            }
            aria-valuetext={
              validTarget
                ? `${hours(summary.horasAsistidas)} de ${hours(target)} horas asistidas`
                : undefined
            }
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
                  <stop stopColor="var(--history-brand-mark)" />
                  <stop offset="100%" stopColor="var(--color-brand-ink)" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" className={styles.ringTrack} />
              <circle
                cx="60"
                cy="60"
                r="50"
                pathLength="100"
                stroke={`url(#${gradientId})`}
                strokeDasharray={`${progress * 100} 100`}
                className={styles.ringValue}
                transform="rotate(-90 60 60)"
                style={{ opacity: progress > 0 ? 1 : 0 }}
              />
            </svg>
            <div>
              <strong>
                <AnimatedNumber value={summary.horasAsistidas} />
              </strong>
              <span>{validTarget ? `de ${hours(target)} h` : "horas asistidas"}</span>
            </div>
          </div>
          <div className={styles.pathSummary}>
            <p className={styles.milestone}>
              {progress >= 1 ? <CheckIcon className={styles.achievement} /> : null}
              {milestone}
            </p>
            {validTarget ? (
              <p className={styles.secondary}>
                Tu objetivo es completar {hours(target)} horas asistidas.
              </p>
            ) : (
              <p className={styles.secondary}>
                La escuela aún no ha registrado un objetivo de horas válido. Tus asistencias se
                conservan aquí.
              </p>
            )}
            {canSegment ? (
              <>
                <div
                  className={styles.pathBar}
                  role="img"
                  aria-label={`${hours(summary.horasAsistidas)} horas asistidas; ${hours(scheduled)} horas programadas; ${hours(unplanned!)} horas sin programar`}
                >
                  {attendedPart > 0 ? (
                    <span data-state="attended" style={{ width: `${attendedPart * 100}%` }} />
                  ) : null}
                  {scheduledPart > 0 ? (
                    <span data-state="scheduled" style={{ width: `${scheduledPart * 100}%` }} />
                  ) : null}
                  {unplanned! > 0 ? (
                    <span
                      className={styles.unplannedSegment}
                      style={{ flex: Math.max(0, 1 - attendedPart - scheduledPart) }}
                    />
                  ) : null}
                </div>
                <ul className={styles.legend}>
                  <li data-state="attended">
                    <i />
                    {hours(summary.horasAsistidas)} h asistidas
                  </li>
                  <li data-state="scheduled">
                    <i />
                    {hours(scheduled)} h programadas
                  </li>
                  <li>
                    <i className={styles.hollowDot} />
                    {hours(unplanned!)} h sin programar
                  </li>
                </ul>
              </>
            ) : null}
          </div>
        </div>
        <p className={styles.certificationNote}>
          <HistoryIcon kind="info" />
          Solo las horas registradas como «Asistió» cuentan para tu certificación.
        </p>
      </section>
      <section className={styles.kpis} aria-label="Resumen de asistencia">
        <article className={styles.kpi} data-state="scheduled">
          <div className={styles.kpiLabel}>
            <HistoryIcon />
            <h2>Por asistir</h2>
          </div>
          <p className={styles.kpiValue}>
            {scheduled === null ? (
              "—"
            ) : (
              <>
                <AnimatedNumber value={scheduled} />
                <small> h</small>
              </>
            )}
          </p>
          <p>
            {upcomingCount === null
              ? "Completando tu historial"
              : `${upcomingCount} prácticas programadas`}
          </p>
        </article>
        <article
          className={styles.kpi}
          data-state={summary.horasPerdidas > 0 ? "lost" : "cancelled"}
        >
          <div className={styles.kpiLabel}>
            <HistoryIcon kind="clock" />
            <h2>Horas perdidas</h2>
            <span
              tabIndex={0}
              className={styles.help}
              aria-label="Dato informativo; no reduce las horas que debes cumplir."
              title="Dato informativo; no reduce las horas que debes cumplir."
            >
              <HistoryIcon kind="info" />
            </span>
          </div>
          <p className={styles.kpiValue}>
            <AnimatedNumber value={summary.horasPerdidas} />
            <small> h</small>
          </p>
          <p>Información de tu asistencia registrada</p>
        </article>
        <article className={styles.kpi} data-state="attended">
          <div className={styles.kpiLabel}>
            <HistoryIcon kind="chart" />
            <h2>Tasa de asistencia</h2>
          </div>
          <p
            className={styles.kpiValue}
            title={
              rateBase > 0
                ? "Horas asistidas / (asistidas + perdidas)"
                : "Aún sin prácticas registradas"
            }
          >
            {rateBase > 0 ? (
              <AnimatedNumber value={(summary.horasAsistidas / rateBase) * 100} percent />
            ) : (
              "—"
            )}
          </p>
          <p>
            {rateBase > 0
              ? "Sobre las horas asistidas y perdidas"
              : "Aún sin prácticas registradas"}
          </p>
        </article>
      </section>
    </>
  );
}
