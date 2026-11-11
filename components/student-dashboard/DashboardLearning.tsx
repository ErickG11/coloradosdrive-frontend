import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";
import type { StudentCatalog } from "@/types/studentContent";
import { LearningIcon, visualTitle } from "@/components/learning/SubjectIdentity";
import { EnrollmentBadge, EnrollmentCount } from "@/components/student-enrollment/EnrollmentVisual";
import { catalogSummary, courseHref, number, percentage, practiceSummary } from "./dashboardModel";
import { DashboardRing } from "./DashboardVisual";
import styles from "./dashboard.module.css";

export function DashboardIndicators({
  catalog,
  practices,
}: {
  catalog: StudentCatalog | null;
  practices: PracticeHistoryPage["summary"] | null;
}) {
  const content = catalogSummary(catalog),
    practice = practiceSummary(practices);
  const indicators: {
    label: string;
    icon: string;
    tone: string;
    value: ReactNode;
    detail: string;
    chart: ReactNode;
  }[] = [];
  indicators.push({
      label: "Avance del contenido",
      icon: "archivo",
      tone: "course",
      value: content.content !== null ? (
        <>
          <EnrollmentCount value={Math.round(content.content)} />
          <small>%</small>
        </>
      ) : "—",
      detail: content.content !== null ? `${content.materialCount.done} de ${content.materialCount.total} materiales` : "Sin materiales publicados",
      chart: content.content !== null ? <DashboardRing value={content.content} label="Materiales completados" small showValue={false} /> : <div className={styles.miniBar} aria-hidden="true" />,
    });
  indicators.push({
      label: "Promedio de exámenes",
      icon: "examen",
      tone: "exams",
      value:
        content.average !== null ? (
          <>
            <EnrollmentCount value={content.average} />
            <small>/100</small>
          </>
        ) : (
          "—"
        ),
      detail: content.average !== null ? "Media de mejores notas" : "Aún sin exámenes rendidos",
      chart: <div className={styles.miniBar} aria-label={content.average !== null ? `Promedio ${number(content.average)} de 100` : "Sin notas"} role="img"><span style={{ transform: `scaleX(${(content.average ?? 0) / 100})` }} />{content.average !== null ? <i style={{ left: `${content.average}%` }} /> : null}</div>,
    });
  indicators.push({
      label: "Horas de práctica",
      icon: "practica",
      tone: "practice",
      value: practices ? (
        <>
          <EnrollmentCount value={practices.horasAsistidas} />
          <small>
            {practices.horasObjetivo !== null ? `/${number(practices.horasObjetivo)} h` : " h"}
          </small>
        </>
      ) : "—",
      detail: practices?.horasObjetivo !== null && practices?.horasObjetivo !== undefined
        ? `${number(practices.horasAsistidas)} de ${number(practices.horasObjetivo)} h`
        : "Objetivo aún no disponible",
      chart: <div className={styles.miniBar} role="img" aria-label={practice.progress !== null ? `Práctica: ${percentage(practice.progress)}` : "Objetivo de práctica no disponible"}><span style={{ transform: `scaleX(${(practice.progress ?? 0) / 100})` }} /></div>,
    });
  indicators.push({
      label: "Asistencia",
      icon: "check",
      tone: "attendance",
      value:
        practice.attendance !== null ? (
          <>
            <EnrollmentCount value={practice.attendance} />
            <small>%</small>
          </>
        ) : (
          "—"
        ),
      detail: practice.attendance !== null ? "Horas asistidas / registradas" : "Aún sin datos",
      chart: practice.attendance !== null
        ? <DashboardRing value={practice.attendance} label="Asistencia por horas" small showValue={false} />
        : <div className={styles.emptyRing} role="img" aria-label="Asistencia aún sin datos" />,
    });
  if (!indicators.length) return null;
  return (
    <div className={styles.indicators}>
    <div className={styles.sectionHeading}><h2>Indicadores de tu avance</h2><p>Tu curso, notas y práctica en una mirada.</p></div>
    <div className={styles.kpiGrid} data-count={indicators.length}>
      {indicators.map((item) => (
        <article className={styles.kpi} data-tone={item.tone} key={item.label}>
          <span className={styles.kpiIcon}>
            <LearningIcon name={item.icon} />
          </span>
          <h3>{item.label}</h3>
          <div className={styles.kpiValue}>{item.value}</div>
          <p>{item.detail}{item.label === "Asistencia" && practice.attendance === null ? <span className={styles.infoTip} tabIndex={0} role="note" aria-label="Se calcula como horas asistidas divididas entre horas asistidas y perdidas. Aparece cuando se registre alguna hora." title="Se calcula como horas asistidas / (asistidas + perdidas). Aparece cuando se registre alguna hora.">i</span> : null}</p>
          <div className={styles.kpiVisual}>{item.chart}</div>
        </article>
      ))}
    </div>
    </div>
  );
}
export function DashboardSubjects({
  catalog,
  loading,
}: {
  catalog: StudentCatalog | null;
  loading: boolean;
}) {
  const summary = catalogSummary(catalog);
  const rank = (value: number | null) => (value === null || value === 0 ? 1 : value >= 100 ? 2 : 0);
  const subjects = [...summary.subjects].sort(
    (a, b) => rank(a.contentPercent) - rank(b.contentPercent) || a.order_index - b.order_index,
  );
  return (
    <div className={styles.learning}>
      <div className={styles.sectionHeading}>
        <h2>Mis materias</h2>
        <p>Tu avance en materiales. Las notas tienen su propio espacio más abajo.</p>
      </div>
      {loading ? (
        <div role="status" className={styles.sectionSkeleton}>
          <span className="sr-only">Cargando materias…</span>
        </div>
      ) : subjects.length ? (
        <div className={styles.subjectGrid}>
          {subjects.map((subject, index) => {
            const value = subject.contentPercent;
            const state =
              value !== null && value >= 100
                ? { label: "Completada", tone: "confirmed" as const }
                : value !== null && value > 0
                  ? { label: "En curso", tone: "in-progress" as const }
                  : { label: "Sin iniciar", tone: "cancelled" as const };
            return (
              <article
                key={subject.id}
                className={styles.subjectCard}
                style={
                  {
                    "--subject-accent": `var(--color-avatar-${subject.order_index % 6})`,
                    "--item-delay": `${Math.min(index, 5) * 35}ms`,
                  } as CSSProperties
                }
              >
                <div className={styles.subjectTop}>
                  <span className={styles.subjectIcon}>
                    <LearningIcon name={subject.title} />
                  </span>
                  <EnrollmentBadge {...state} />
                </div>
                <h3>{visualTitle(subject.title)}</h3>
                <span className={styles.subjectMetricLabel}>Materiales completados · {value === null ? "sin datos" : percentage(value)}</span>
                <div className={styles.subjectProgress}>
                  {value !== null ? (
                    <DashboardRing value={value} label={`Materiales completados de ${subject.title}`} />
                  ) : null}
                  <p>
                    {subject.total
                      ? `${subject.completed} de ${subject.total} materiales completados`
                      : "Esta materia todavía no tiene materiales publicados."}
                  </p>
                </div>
                <Link className={styles.textLink} href={courseHref(catalog!.course_id)}>
                  Continuar<span className="sr-only"> {subject.title}</span>
                  <LearningIcon name="arrow" />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyCopy}>
          Tu contenido estará disponible cuando tu curso lo habilite.
        </p>
      )}
    </div>
  );
}
