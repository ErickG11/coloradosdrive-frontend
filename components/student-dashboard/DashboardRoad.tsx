import type { CSSProperties } from "react";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";
import type { StudentCatalog } from "@/types/studentContent";
import { EnrollmentIcon } from "@/components/student-enrollment/EnrollmentVisual";
import { LearningIcon } from "@/components/learning/SubjectIdentity";
import { catalogSummary, estimatedProgress, estimatedShares, number, percentage, practiceSummary } from "./dashboardModel";
import styles from "./dashboard.module.css";

export function DashboardRoad({ catalog, practices, courseType }: {
  catalog: StudentCatalog | null;
  practices: PracticeHistoryPage["summary"] | null;
  courseType: "A" | "B";
}) {
  const summary = catalogSummary(catalog);
  const practice = practiceSummary(practices);
  const exams = summary.requiredExams
    ? (summary.requiredExams.done / summary.requiredExams.total) * 100
    : null;
  const estimated = estimatedProgress(summary.content, exams, practice.progress);
  const fronts = [
    ...(summary.content !== null ? [{
      label: "Materiales publicados", icon: "archivo", value: summary.content,
      detail: `${summary.materialCount.done} de ${summary.materialCount.total} materiales completados`,
    }] : []),
    ...(exams !== null && summary.requiredExams ? [{
      label: "Exámenes obligatorios", icon: "examen", value: exams,
      detail: `${summary.requiredExams.done} de ${summary.requiredExams.total} exámenes aprobados`,
    }] : []),
    ...(practice.progress !== null && practices ? [{
      label: "Horas asistidas", icon: "practica", value: practice.progress,
      detail: `${number(practices.horasAsistidas)} de ${number(practices.horasObjetivo!)} h asistidas`,
    }] : []),
  ];
  const shares = estimatedShares(fronts.map((front) => front.value));
  return (
    <div className={styles.roadSection}>
      <div className={styles.roadHeading}>
        <div><h2>Tu ruta a la certificación</h2><p>Materiales, exámenes y horas avanzan en paralelo.</p></div>
        {estimated !== null ? <div className={styles.estimated}><span>Avance estimado</span><strong>{percentage(estimated)}</strong></div> : null}
      </div>
      <div className={styles.roadPanel}>
      {estimated !== null ? (
        <div className={styles.courseRoad} style={{ "--dashboard-progress": estimated } as CSSProperties}
          role="img" aria-label={`Avance estimado: ${percentage(estimated)}. No representa la emisión del certificado.`}>
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="dashboard-asphalt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-border-strong)" /><stop offset="1" stopColor="var(--color-bg-sunken)" /></linearGradient></defs>
            <path className={styles.asphalt} d="M35 50H965" />
            <path className={styles.roadProgress} d="M35 50H965" pathLength="100" style={{ strokeDashoffset: 100 - estimated }} />
            <path className={styles.roadCenter} d="M35 50H965" />
          </svg>
          <div className={styles.roadMarkers} aria-hidden="true"><i>25</i><i>50</i><i>75</i></div>
          <div className={styles.travelerTrack} aria-hidden="true"><span className={styles.traveler}><EnrollmentIcon kind={courseType === "A" ? "moto" : "car"} /></span></div>
          <div className={styles.finishFlag} aria-hidden="true"><span /><small>Certificación</small></div>
        </div>
      ) : <p className={styles.emptyCopy}>Tu recorrido aparecerá cuando haya contenido o un objetivo de prácticas disponible.</p>}
      {fronts.length ? <div className={styles.roadFronts}>
        {fronts.map((front, index) => (
          <div key={front.label} className={styles.roadFront} data-state={front.value >= 100 ? "complete" : front.value > 0 ? "current" : "pending"}
            style={{ "--front-progress": `${front.value}%`, "--item-delay": `${index * 80}ms` } as CSSProperties}>
            <span className={styles.frontIcon}><LearningIcon name={front.icon} /></span>
            <div className={styles.frontBody}>
              <div className={styles.frontHeading}><strong>{front.label}</strong><span>{percentage(front.value)}</span></div>
              <div className={styles.frontTrack} aria-hidden="true"><span /></div>
              <p>{front.detail}</p>
            </div>
          </div>
        ))}
      </div> : null}
      <details className={styles.calculation}>
        <summary>¿Cómo se calcula este avance?</summary>
        {estimated === null ? <p>Aún no hay frentes suficientes para calcular un porcentaje.</p> : (
          <div className={styles.calculationBreakdown}>
            {fronts.map((front, index) => <p key={front.label}>{front.label}: {percentage(front.value)} · peso 1/{fronts.length} · aporte redondeado {shares[index]} puntos</p>)}
            <p><strong>{shares.join(" + ")} = {percentage(estimated)}.</strong></p>
          </div>
        )}
        <p>Las materias oficiales requieren completar sus materiales obligatorios y aprobar los exámenes obligatorios. También se deben cumplir las horas asistidas registradas. La escuela verifica además cohorte, documentos y pagos; este porcentaje no confirma ni emite tu certificado.</p>
      </details>
      </div>
    </div>
  );
}
