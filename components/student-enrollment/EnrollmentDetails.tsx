import Link from "next/link";
import type { ReactNode } from "react";
import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { documentProgress } from "@/components/student-documents/documentsModel";
import {
  accountRole,
  courseClock,
  licenseLabel,
  longDate,
  practiceDate,
  type EnrollmentIdentity,
} from "./enrollmentModel";
import { EnrollmentCount, EnrollmentIcon, type EnrollmentIconKind } from "./EnrollmentVisual";
import styles from "./enrollment-overview.module.css";

export function EnrollmentDataCard({
  title,
  icon,
  identity,
  fields,
  children,
  complete = false,
}: {
  title: string;
  icon: EnrollmentIconKind;
  identity: "course" | "cohort" | "access" | "documents" | "payment";
  fields?: { label: string; value: ReactNode }[];
  children?: ReactNode;
  complete?: boolean;
}) {
  return (
    <section className={styles.dataCard} data-identity={identity} data-complete={complete}>
      <div className={styles.dataTitle}>
        <span className={styles.dataIcon}>
          <EnrollmentIcon kind={icon} />
        </span>
        <h2>{title}</h2>
      </div>
      {fields?.length ? (
        <dl className={styles.dataList}>
          {fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}
export function EnrollmentDocuments({ state }: { state: StudentEnrollmentState | null }) {
  const { applicable, received } = documentProgress(state?.documentosFisicos ?? []);
  const known = Boolean(state?.documentosFisicos.length);
  return (
    <EnrollmentDataCard
      title="Tus documentos"
      icon="document"
      identity="documents"
      complete={applicable.length > 0 && received === applicable.length}
    >
      {known && applicable.length > 0 ? (
        <div className={styles.documentSummary}>
          <div className={styles.miniRing} data-complete={received === applicable.length}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" pathLength="100" />
              <circle
                cx="50"
                cy="50"
                r="42"
                pathLength="100"
                strokeDasharray={`${(received / applicable.length) * 100} 100`}
              />
            </svg>
            <strong>
              {received}/{applicable.length}
            </strong>
          </div>
          <div>
            <strong>
              {received} de {applicable.length} entregados
            </strong>
            <p>Recepción registrada por la escuela.</p>
          </div>
        </div>
      ) : (
        <p className={styles.secondary}>
          {known
            ? "Los documentos registrados no aplican a esta matrícula."
            : state
              ? "No hay documentos listados para esta matrícula."
              : "Por ahora solo puedes consultar los documentos de tu matrícula principal."}
        </p>
      )}
      <Link href="/student/documents" className={styles.textLink}>
        Ver documentos
        <EnrollmentIcon kind="arrow" />
      </Link>
    </EnrollmentDataCard>
  );
}
export function EnrollmentDetails({
  enrollment,
  courseName,
  identity,
  state,
  hoursPerDay,
  children,
}: {
  enrollment: PracticeHistoryEnrollment;
  courseName: string | null;
  cohortName: string | null;
  identity: EnrollmentIdentity | null;
  state: StudentEnrollmentState | null;
  children?: ReactNode;
  hoursPerDay: number | null;
}) {
  const courseFields: { label: string; value: ReactNode }[] = [
    { label: "Licencia", value: licenseLabel(enrollment.courseType) },
  ];
  if (courseName) courseFields.push({ label: "Curso", value: courseName });
  if (hoursPerDay !== null)
    courseFields.push({ label: "Horas por día reservadas", value: hoursPerDay });
  if (enrollment.horasObjetivo !== null)
    courseFields.push({
      label: "Horas objetivo de prácticas",
      value: `${enrollment.horasObjetivo} h`,
    });
  return (
    <div className={`${styles.detailGrid} ${styles.enter}`}>
      <EnrollmentDataCard
        title="Tu curso"
        icon={enrollment.courseType === "A" ? "moto" : "car"}
        identity="course"
        fields={courseFields}
      />
      <EnrollmentDataCard
        title="Tu acceso"
        icon="access"
        identity="access"
        fields={[
          { label: "Correo de acceso", value: identity?.email ?? "No disponible" },
          { label: "Rol", value: accountRole(identity?.role ?? null) ?? "No disponible" },
          ...(identity?.createdAt && longDate(identity.createdAt)
            ? [{ label: "Alta de la cuenta", value: longDate(identity.createdAt) }]
            : []),
          { label: "Contraseña", value: <span aria-label="Contraseña protegida">••••••••</span> },
        ]}
      >
        <Link className={styles.textLink} href="/student/change-password">
          Cambiar contraseña
          <EnrollmentIcon kind="arrow" />
        </Link>
        <p className={styles.securityNote}>
          No compartas tu contraseña con nadie, ni siquiera con la escuela.
        </p>
      </EnrollmentDataCard>
      <EnrollmentDocuments state={state} />
      {children}
    </div>
  );
}
export function EnrollmentStatusPanel({
  enrollment,
  nextPractice,
  practiceError,
  practiceLoading,
  practiceNotice = null,
  courseStart = null,
  courseEnd = null,
  now,
}: {
  enrollment: PracticeHistoryEnrollment;
  nextPractice: string | null;
  practiceError: boolean;
  practiceLoading: boolean;
  practiceNotice?: string | null;
  courseStart?: string | null;
  courseEnd?: string | null;
  now: string;
}) {
  const clock = courseClock(courseStart, courseEnd, now);
  return (
    <EnrollmentDataCard title="Lo que viene en tu curso" icon="calendar" identity="course">
      {clock ? (
        <div className={styles.courseTime}>
          <span>{clock.label}</span>
          {clock.value !== null ? (
            <strong>
              <EnrollmentCount value={clock.value} />
            </strong>
          ) : null}
          <div
            className={styles.timeBar}
            role="progressbar"
            aria-label="Tiempo del curso"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clock.progress * 100)}
          >
            <span style={{ transform: `scaleX(${clock.progress})` }} />
          </div>
        </div>
      ) : null}
      {enrollment.horasObjetivo !== null ? (
        <div className={styles.hours}>
          <strong>
            <EnrollmentCount value={enrollment.horasObjetivo} />
            <span> h</span>
          </strong>
          <div>
            Objetivo de prácticas<p>Tu meta de formación práctica.</p>
          </div>
        </div>
      ) : (
        <p className={styles.secondary}>
          Las horas objetivo de esta matrícula aún no están disponibles aquí.
        </p>
      )}
      <div className={styles.nextPractice}>
        <span className={styles.dataIcon}>
          <EnrollmentIcon kind="calendar" />
        </span>
        <div>
          <h3>Próxima práctica</h3>
          <p>
            {practiceNotice ??
              (practiceError
                ? "No pudimos consultar tus prácticas."
                : practiceLoading
                  ? "Consultando tus prácticas…"
                  : nextPractice
                    ? practiceDate(nextPractice)
                    : "Sin prácticas próximas")}
          </p>
        </div>
      </div>
      <Link href="/student/schedule" className={styles.textLink}>
        Horarios de práctica
        <EnrollmentIcon kind="arrow" />
      </Link>
      {!clock ? (
        <p className={styles.panelNote}>
          Consulta tus horarios para organizar tu próxima práctica.
        </p>
      ) : null}
    </EnrollmentDataCard>
  );
}
