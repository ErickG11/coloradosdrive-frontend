"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { useEnrollmentOverview } from "@/components/student-enrollment/useEnrollmentOverview";
import { EnrollmentIcon } from "@/components/student-enrollment/EnrollmentVisual";
import { shortEnrollmentId } from "@/components/student-enrollment/enrollmentModel";
import { usePracticePlan } from "@/app/(student)/student/schedule/usePracticePlan";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { DashboardHero } from "./DashboardHero";
import { DashboardError, DashboardReveal, DashboardSkeleton } from "./DashboardVisual";
import { catalogSummary } from "./dashboardModel";
import { dashboardNow, useDashboardCatalog } from "./useDashboardData";
import styles from "./dashboard.module.css";

const DashboardRoad = dynamic(
  () => import("./DashboardRoad").then((module) => module.DashboardRoad),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sectionSkeleton} data-shape="road" role="status">
        <span className="sr-only">Cargando tu ruta…</span>
      </div>
    ),
  },
);
const DashboardIndicators = dynamic(
  () => import("./DashboardLearning").then((module) => module.DashboardIndicators),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sectionSkeleton} data-shape="indicators" role="status">
        <span className="sr-only">Cargando indicadores…</span>
      </div>
    ),
  },
);
const DashboardSubjects = dynamic(
  () => import("./DashboardLearning").then((module) => module.DashboardSubjects),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sectionSkeleton} role="status">
        <span className="sr-only">Cargando materias…</span>
      </div>
    ),
  },
);
const DashboardGrades = dynamic(
  () => import("./DashboardGrades").then((module) => module.DashboardGrades),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sectionSkeleton} data-shape="grades" role="status">
        <span className="sr-only">Cargando notas…</span>
      </div>
    ),
  },
);

export function DashboardWorkspace() {
  const state = useFetch<StudentEnrollmentState>("/estudiantes/estado-inscripcion");
  const overview = useEnrollmentOverview(state.refetch);
  const [selected, setSelected] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const identityId = overview.identity?.id;
  useEffect(() => {
    if (!identityId) return;
    const timer = window.setTimeout(() => {
      try {
        setSelected(localStorage.getItem(`coloradosdrive:dashboard-enrollment:v1:${identityId}`));
      } catch {
        /* Storage is optional. */
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [identityId]);
  const allEnrollments = overview.enrollments.data ?? [];
  const current = allEnrollments.filter(
    (item) => item.status === "activo" || item.status === "pendiente_cohorte",
  );
  const enrollments = current.length
    ? current
    : allEnrollments.filter((item) => item.status === "finalizado");
  const enrollment =
    enrollments.find((item) => item.enrollmentId === selected) ??
    enrollments.find((item) => item.enrollmentId === state.data?.enrollmentId) ??
    enrollments[0];
  const courseId =
    state.data?.accesoCompleto && enrollment?.status === "activo" && enrollment.cohortId
      ? enrollment.courseId
      : null;
  const content = useDashboardCatalog(courseId);
  const history = usePracticePlan(
    state.data?.accesoCompleto ? (enrollment?.enrollmentId ?? null) : null,
    overview.slots.data,
    historyRevision,
  );
  const practices =
    history?.data?.enrollmentId === enrollment?.enrollmentId
      ? (history?.data?.summary ?? null)
      : null;
  const model = catalogSummary(content.catalog);
  const ambiguous = Boolean(
    enrollment?.cohortId &&
    allEnrollments.filter((item) => item.cohortId === enrollment.cohortId).length > 1,
  );
  const now = dashboardNow(content.clock, overview.now);
  const next =
    enrollment?.status === "activo" && !ambiguous
      ? overview.ownSlots
          .filter(
            (slot) =>
              slot.cohortId === enrollment.cohortId &&
              (slot.status === "asignado" || slot.status === "confirmado") &&
              Date.parse(slot.scheduledAt) > (now ?? Date.parse(state.data?.serverNow ?? "")),
          )
          .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]
      : null;
  function choose(id: string) {
    setSelected(id);
    if (identityId)
      try {
        localStorage.setItem(`coloradosdrive:dashboard-enrollment:v1:${identityId}`, id);
      } catch {
        /* Storage is optional. */
      }
  }
  if (state.data && !state.data.accesoCompleto) return null; // The existing proxy redirects restricted students to enrollment.
  const loading =
    !overview.identityReady ||
    (identityId && !storageReady) ||
    (overview.enrollments.isLoading && overview.enrollments.data === null) ||
    (state.isLoading && state.data === null);
  if (loading)
    return (
      <div className={styles.workspace}>
        <h1>Mi panel</h1>
        <DashboardSkeleton />
      </div>
    );
  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Mi panel</h1>
          <p>Tu avance, tu siguiente paso y todo lo que estás construyendo.</p>
        </div>
        {enrollment ? (
          <Link className={styles.textLink} href="/student/inscripcion">
            Ver mi inscripción
            <EnrollmentIcon kind="arrow" />
          </Link>
        ) : null}
      </header>
      {overview.enrollments.error || overview.identityError || state.error ? (
        <DashboardError retry={overview.refresh}>
          No pudimos actualizar todos tus datos. Puedes reintentar sin perder el resto del panel.
        </DashboardError>
      ) : null}
      {enrollments.length > 1 ? (
        <div className={styles.selector} role="group" aria-label="Selecciona el curso de tu panel">
          {enrollments.map((item) => (
            <button
              type="button"
              aria-pressed={enrollment?.enrollmentId === item.enrollmentId}
              key={item.enrollmentId}
              onClick={() => choose(item.enrollmentId)}
            >
              <EnrollmentIcon kind={item.courseType === "A" ? "moto" : "car"} />
              <span>
                {item.courseType === "A" ? "Moto · Licencia A" : "Auto · Licencia B"}
                {enrollments.filter((other) => other.courseType === item.courseType).length > 1 ? (
                  <small>N.º {shortEnrollmentId(item.enrollmentId)}</small>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {!enrollment ? (
        <section className={styles.empty}>
          <EnrollmentIcon kind="flag" />
          <h2>Tu próximo camino empieza aquí</h2>
          <p>Cuando tengas una matrícula disponible, aquí podrás seguir tu avance.</p>
          <Link className={styles.textLink} href="/student/inscripcion">
            Consultar mi inscripción
            <EnrollmentIcon kind="arrow" />
          </Link>
        </section>
      ) : (
        <>
          <DashboardHero
            enrollment={enrollment}
            name={overview.identity?.name ?? null}
            cohort={
              state.data?.enrollmentId === enrollment.enrollmentId &&
              state.data.cohorte?.id === enrollment.cohortId
                ? state.data.cohorte.nombre
                : null
            }
            next={next?.scheduledAt ?? null}
            now={now}
            practices={practices}
            content={model.content}
            bestScore={model.best}
            continueCourse={Boolean(content.catalog?.continuar)}
            practiceError={Boolean(
              overview.slots.error ||
              overview.identityError ||
              ambiguous ||
              (overview.slots.isLoading && !overview.slots.data),
            )}
          />
          <div className={styles.selectedContent} key={enrollment.enrollmentId}>
            <DashboardReveal label="Tu ruta a la certificación" placeholder="road">
              <DashboardRoad
                catalog={content.catalog}
                practices={practices}
                courseType={enrollment.courseType}
              />
            </DashboardReveal>
            <DashboardReveal label="Indicadores de tu avance" placeholder="indicators">
              {content.error ? (
                <DashboardError retry={content.retry}>
                  No pudimos actualizar tu contenido. El resto del panel sigue disponible.
                </DashboardError>
              ) : null}
              {history?.error ? (
                <DashboardError retry={() => setHistoryRevision((value) => value + 1)}>
                  No pudimos consultar las horas de esta matrícula. Reintenta o consulta con la
                  escuela.
                </DashboardError>
              ) : null}
              <DashboardIndicators catalog={content.catalog} practices={practices} />
            </DashboardReveal>
            <DashboardReveal label="Mis materias">
              {content.error && !content.catalog ? (
                <DashboardError retry={content.retry}>
                  No pudimos consultar tus materias.
                </DashboardError>
              ) : (
                <DashboardSubjects catalog={content.catalog} loading={content.loading} />
              )}
            </DashboardReveal>
            <DashboardReveal label="Mis notas" placeholder="grades">
              {content.error && !content.catalog ? (
                <DashboardError retry={content.retry}>
                  No pudimos consultar tus notas.
                </DashboardError>
              ) : content.loading ? (
                <div className={styles.sectionSkeleton} role="status">
                  <span className="sr-only">Cargando tus notas…</span>
                </div>
              ) : (
                <DashboardGrades catalog={content.catalog} now={now} />
              )}
            </DashboardReveal>
          </div>
        </>
      )}
    </div>
  );
}
