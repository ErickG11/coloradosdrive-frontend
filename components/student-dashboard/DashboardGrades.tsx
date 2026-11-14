"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { LearningIcon } from "@/components/learning/SubjectIdentity";
import { EnrollmentBadge, EnrollmentCount } from "@/components/student-enrollment/EnrollmentVisual";
import type { StudentCatalog, StudentItem } from "@/types/studentContent";
import {
  catalogSummary,
  courseHref,
  dateTime,
  examState,
  number,
  validScore,
} from "./dashboardModel";
import { useDashboardAttempts } from "./useDashboardData";
import { DashboardError } from "./DashboardVisual";
import styles from "./dashboard.module.css";

function availability(item: StudentItem, now: number | null) {
  const closed = item.access.closes_at && now !== null && Date.parse(item.access.closes_at) <= now;
  const exhausted =
    item.intentos_permitidos != null &&
    (item.intentos_usados ?? 0) >= item.intentos_permitidos &&
    !item.intento_en_progreso;
  if (exhausted) return { open: false, label: "Sin intentos disponibles" };
  if (closed || item.access.estado === "cerrado") return { open: false, label: "Ventana cerrada" };
  if (item.access.estado === "abierto")
    return {
      open: true,
      label:
        item.access.closes_at && dateTime(item.access.closes_at)
          ? `Disponible hasta ${dateTime(item.access.closes_at)}`
          : "Disponible",
    };
  return {
    open: false,
    label:
      item.access.estado === "programado" && dateTime(item.access.opens_at)
        ? `Se abre el ${dateTime(item.access.opens_at)}`
        : "Aún no disponible",
  };
}
export function DashboardGrades({
  catalog,
  now,
}: {
  catalog: StudentCatalog | null;
  now: number | null;
}) {
  const summary = catalogSummary(catalog);
  const attempts = useDashboardAttempts(
    summary.exams
      .filter(({ item }) => (item.intentos_usados ?? 0) > 0)
      .map(({ item }) => item.exam_id!),
  );
  const [active, setActive] = useState<string | null>(null);
  const tooltipId = useId();
  const scored = summary.exams.filter(({ item }) => validScore(item.mejor_nota));
  const columns = Math.max(1, scored.length),
    width = Math.max(640, columns * 74),
    step = (width - 100) / columns;
  const describe = (id: string) => {
    const exam = summary.exams.find(({ item }) => item.exam_id === id);
    if (!exam) return "";
    const best = (attempts.values[id] ?? [])
      .filter((attempt) => attempt.status === "completado" && validScore(attempt.scorePercent))
      .sort(
        (a, b) =>
          b.scorePercent! - a.scorePercent! ||
          Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt),
      )[0];
    return `${exam.subject} · ${exam.item.title}. Mejor nota: ${number(exam.item.mejor_nota!)} sobre 100.${best && best.scorePercent === exam.item.mejor_nota ? ` Intento ${best.attemptNumber ?? "sin número"}${dateTime(best.completedAt) ? `, ${dateTime(best.completedAt)}` : ""}.` : " El detalle del intento aún no está disponible."}`;
  };
  return (
    <div className={styles.grades}>
      <div className={styles.sectionHeading}>
        <h2>Mis notas</h2>
        <p>Tus resultados, con la mejor nota de cada examen. Escala original: 0 a 100.</p>
      </div>
      <div className={styles.gradePanel}>
      {summary.exams.length ? (
        <div className={styles.gradeSummary}>
          <div>
            <span>Promedio</span>
            <strong>
              {summary.average !== null ? <EnrollmentCount value={summary.average} /> : "—"}
              <small>/100</small>
            </strong>
          </div>
          <div>
            <span>Mejor nota</span>
            <strong>
              {summary.best !== null ? number(summary.best) : "—"}
              <small>/100</small>
            </strong>
          </div>
          <div>
            <span>Exámenes rendidos</span>
            <strong>
              {summary.taken}
              <small>/{summary.exams.length}</small>
            </strong>
          </div>
        </div>
      ) : null}
      {attempts.errors.length ? (
        <DashboardError retry={attempts.retry}>
          No pudimos actualizar el detalle de algunos intentos. Tus notas disponibles se conservan.
        </DashboardError>
      ) : null}
      {scored.length > 0 && scored.length <= 2 ? (
        <div className={styles.bulletList} aria-label="Mejores notas por examen, escala de cero a cien">
          {scored.map(({ item, subject }) => (
            <div key={item.exam_id} className={styles.bullet} data-passed={item.completado}
              role="img" aria-label={describe(item.exam_id!)} tabIndex={0} title={describe(item.exam_id!)}>
              <div className={styles.bulletHeading}><span>{subject} · {item.title}</span><strong>{number(item.mejor_nota!)} /100</strong></div>
              <div className={styles.bulletTrack}><span style={{ width: `${item.mejor_nota}%` }} /></div>
            </div>
          ))}
        </div>
      ) : scored.length >= 3 ? (
        <div className={styles.chartRegion}>
          <div
            className={styles.chartScroll}
            tabIndex={0}
            role="region"
            aria-label="Gráfico de mejores notas por examen. Desplázate horizontalmente si es necesario."
          >
            <svg
              viewBox={`0 0 ${width} 266`}
              style={{ minWidth: width }}
              className={styles.gradeChart}
              aria-label="Mejor nota por examen, escala de cero a cien"
            >
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick} aria-hidden="true">
                  <path className={styles.chartGrid} d={`M45 ${216 - tick * 1.8}H${width - 20}`} />
                  <text x="32" y={220 - tick * 1.8} textAnchor="end">
                    {tick}
                  </text>
                </g>
              ))}
              {scored.map(({ item }, index) => {
                const x = 60 + index * step,
                  score = item.mejor_nota!,
                  height = score * 1.8,
                  id = item.exam_id!;
                return (
                  <g
                    key={id}
                    className={styles.chartColumn}
                    data-passed={item.completado}
                    tabIndex={0}
                    role="img"
                    aria-label={describe(id)}
                    aria-describedby={active === id ? tooltipId : undefined}
                    onFocus={() => setActive(id)}
                    onBlur={() => setActive(null)}
                    onMouseEnter={() => setActive(id)}
                    onMouseLeave={() => setActive(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setActive(null);
                    }}
                  >
                    <rect
                      className={styles.chartHit}
                      x={x - 5}
                      y="20"
                      width={step - 10}
                      height="218"
                    />
                    <rect
                      className={styles.gradeBar}
                      x={x + 8}
                      y={216 - height}
                      width={Math.min(56, Math.max(16, step - 34))}
                      height={height}
                      rx="5"
                      style={{
                        animationDelay: `${Math.min(index, 8) * 35}ms`,
                        transformOrigin: `${x}px 216px`,
                      }}
                    />
                    <text
                      x={x + 8 + Math.min(56, Math.max(16, step - 34)) / 2}
                      y={Math.max(20, 207 - height)}
                      textAnchor="middle"
                      aria-hidden="true"
                    >
                      {number(score)}
                    </text>
                    <text x={x + 8 + Math.min(56, Math.max(16, step - 34)) / 2} y="245" textAnchor="middle" aria-hidden="true">
                      Examen {index + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={styles.chartTooltip} role={active ? "tooltip" : undefined} id={tooltipId}>
            {active
              ? describe(active)
              : "Enfoca o pasa el puntero por una barra para consultar el examen y su intento."}
          </div>
        </div>
      ) : (
        <p className={styles.emptyCopy}>
          Aún no has rendido exámenes. Aquí verás tus notas cuando completes un intento de tu curso.
        </p>
      )}
      {summary.exams.length ? (
        <div className={styles.examDetails}>
          <h3>Detalle por examen</h3>
          {attempts.loading ? (
            <p className={styles.secondary} role="status">
              Consultando las fechas de tus intentos…
            </p>
          ) : null}
          <ul className={styles.examList}>
            {summary.exams.map(({ item, subject }) => {
              const history = attempts.values[item.exam_id!] ?? [];
              const last = [...history].sort(
                (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
              )[0];
              const access = availability(item, now);
              return (
                <li key={item.id}>
                  <div className={styles.examTitle}>
                    <span className={styles.examIcon}>
                      <LearningIcon name="examen" />
                    </span>
                    <div>
                      <span className={styles.secondary}>{subject}</span>
                      <h4>{item.title}</h4>
                    </div>
                    <EnrollmentBadge {...examState(item)} />
                  </div>
                  <dl className={styles.examFacts}>
                    <div>
                      <dt>Intentos usados / permitidos</dt>
                      <dd>
                        {item.intentos_usados ?? "—"} /{" "}
                        {item.intentos_permitidos === null
                          ? "sin límite"
                          : (item.intentos_permitidos ?? "—")}
                      </dd>
                    </div>
                    <div>
                      <dt>Mejor nota</dt>
                      <dd>
                        {validScore(item.mejor_nota) ? `${number(item.mejor_nota)} /100` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Último intento</dt>
                      <dd>
                        {last
                          ? dateTime(last.completedAt ?? last.startedAt)
                          : (item.intentos_usados ?? 0) > 0
                            ? "Detalle no disponible"
                            : "Sin intentos"}
                      </dd>
                    </div>
                  </dl>
                  <div className={styles.examAvailability}>
                    {access.open ? (
                      <Link href={courseHref(catalog!.course_id)} className={styles.availableLink}>
                        {access.label}
                        <LearningIcon name="arrow" />
                      </Link>
                    ) : (
                      <span>{access.label}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      </div>
    </div>
  );
}
