"use client";
import Link from "next/link";
import { PlanChangePanel } from "./PlanChangePanel";
import { useState } from "react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { whatsappHref } from "@/lib/content/landing";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import type { StudentPayment } from "@/types/studentPayment";
import type { StudentScheduleReservation } from "@/types/studentSchedule";
import { useEnrollmentOverview } from "./useEnrollmentOverview";
import {
  enrollmentMilestones,
  enrollmentStatus,
  licenseLabel,
  shortEnrollmentId,
} from "./enrollmentModel";
import { EnrollmentBadge, EnrollmentIcon, EnrollmentSkeleton } from "./EnrollmentVisual";
import { EnrollmentCard } from "./EnrollmentCard";
import { EnrollmentJourney } from "./EnrollmentJourney";
import { EnrollmentDetails, EnrollmentStatusPanel } from "./EnrollmentDetails";
import styles from "./enrollment-overview.module.css";

const contactHref = whatsappHref("Hola, Colorados Drive. Quisiera consultar sobre mi matrícula.");
export function EnrollmentWorkspace({
  state,
  refreshStatus,
  statusError,
  payment,
  reservation,
}: {
  state: StudentEnrollmentState;
  refreshStatus: () => void;
  statusError: boolean;
  payment: StudentPayment | null;
  reservation: StudentScheduleReservation | null;
}) {
  const overview = useEnrollmentOverview(refreshStatus);
  const [selected, setSelected] = useState<string | null>(null);
  const enrollments = overview.enrollments.data ?? [];
  const enrollment =
    enrollments.find((item) => item.enrollmentId === selected) ??
    enrollments.find((item) => item.enrollmentId === state.enrollmentId) ??
    enrollments[0];
  const principal = enrollment?.enrollmentId === state.enrollmentId ? state : null;
  const ownPayment = payment?.enrollmentId === enrollment?.enrollmentId ? payment : null;
  const ownReservation =
    reservation?.enrollmentId === enrollment?.enrollmentId && reservation?.estado === "confirmada"
      ? reservation
      : null;
  const cohortName =
    principal?.cohorte?.id === enrollment?.cohortId
      ? (principal?.cohorte?.nombre ?? null)
      : ownReservation?.cohorte?.id === enrollment?.cohortId
        ? (ownReservation?.cohorte?.nombre ?? null)
        : null;
  const course = overview.courses.data?.find(
    (item) => item.id === enrollment?.courseId && item.tipo === enrollment.courseType,
  );
  // Slots expose cohortId, not enrollmentId. Do not attribute a shared cohort's
  // practices to an arbitrary active enrollment when the association is ambiguous.
  const ambiguousPractices = Boolean(
    enrollment?.cohortId &&
    enrollments.filter((item) => item.status === "activo" && item.cohortId === enrollment.cohortId)
      .length > 1,
  );
  const next =
    enrollment?.status === "activo" && !ambiguousPractices
      ? overview.ownSlots
          .filter(
            (slot) =>
              slot.cohortId === enrollment.cohortId &&
              (slot.status === "asignado" || slot.status === "confirmado") &&
              Date.parse(slot.scheduledAt) > (overview.now ?? Date.parse(state.serverNow)),
          )
          .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]
      : null;
  const loading =
    (overview.enrollments.isLoading && overview.enrollments.data === null) ||
    !overview.identityReady;
  const partialError = Boolean(
    statusError ||
    overview.enrollments.error ||
    overview.slots.error ||
    overview.courses.error ||
    overview.identityError,
  );
  return (
    <div className={styles.workspace}>
      {enrollment?.status === "activo" ? (
        <PlanChangePanel
          key={enrollment.enrollmentId}
          enrollmentId={enrollment.enrollmentId}
          onChanged={overview.refresh}
        />
      ) : null}
      {state.individualDates?.practiceStartDate ? (
        <p>
          Prácticas: {state.individualDates.practiceStartDate} —{" "}
          {state.individualDates.practiceEndDate}. Acceso hasta{" "}
          {state.individualDates.accessEndDate}.
        </p>
      ) : null}
      <header className={styles.header}>
        <div>
          <h1>Mi inscripción</h1>
          <p>Tu matrícula, tu acceso y el camino de tu curso.</p>
        </div>
        {enrollment ? (
          <EnrollmentBadge
            {...enrollmentStatus(enrollment.status)}
            live={enrollment.status === "activo"}
          />
        ) : null}
      </header>
      {enrollments.length > 1 ? (
        <div className={styles.segmented} role="group" aria-label="Selecciona tu matrícula">
          {enrollments.map((item) => (
            <button
              type="button"
              key={item.enrollmentId}
              aria-pressed={enrollment?.enrollmentId === item.enrollmentId}
              onClick={() => setSelected(item.enrollmentId)}
            >
              <EnrollmentIcon kind={item.courseType === "A" ? "moto" : "car"} />
              <span>
                {licenseLabel(item.courseType)}
                {enrollments.filter((other) => other.courseType === item.courseType).length > 1 ? (
                  <small>N.º {shortEnrollmentId(item.enrollmentId)}</small>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {partialError ? (
        <div role="status" className={styles.updateNotice}>
          <p>No pudimos actualizar toda tu ficha. Los datos disponibles se conservan.</p>
          <Button
            variant="ghost"
            onClick={overview.refresh}
            icon={<EnrollmentIcon kind="refresh" />}
          >
            Reintentar
          </Button>
        </div>
      ) : null}
      {loading ? (
        <EnrollmentSkeleton />
      ) : !enrollment ? (
        <section className={styles.empty}>
          <EnrollmentIcon kind="cohort" />
          <h2>
            {overview.enrollments.error
              ? "No pudimos consultar tus matrículas"
              : "Tu próxima etapa empieza aquí"}
          </h2>
          <p>
            {overview.enrollments.error
              ? "Reintenta para recuperar tu ficha."
              : "Tienes acceso a la plataforma, pero todavía no hay matrículas listadas. La escuela puede ayudarte a revisar tu inscripción."}
          </p>
          {overview.enrollments.error ? (
            <Button variant="secondary" onClick={overview.refresh}>
              Reintentar
            </Button>
          ) : (
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName("secondary")}
            >
              <EnrollmentIcon kind="whatsapp" />
              Contactar a la escuela
            </a>
          )}
        </section>
      ) : (
        <div key={enrollment.enrollmentId} className={styles.content}>
          <div className={styles.heroGrid}>
            <div className={styles.enter}>
              <EnrollmentCard
                identity={overview.identity}
                enrollment={enrollment}
                cohortName={cohortName}
              />
            </div>
            <EnrollmentStatusPanel
              enrollment={enrollment}
              nextPractice={next?.scheduledAt ?? null}
              practiceError={Boolean(overview.slots.error || overview.identityError)}
              practiceLoading={overview.slots.isLoading && overview.slots.data === null}
              practiceNotice={
                ambiguousPractices
                  ? "La escuela debe confirmar a qué matrícula pertenecen tus próximas prácticas."
                  : null
              }
              now={state.serverNow}
            />
          </div>
          <EnrollmentJourney
            milestones={enrollmentMilestones(enrollment, principal, overview.identity, ownPayment, {
              reserved: Boolean(ownReservation),
              assigned:
                enrollment.status === "activo" &&
                !ambiguousPractices &&
                overview.ownSlots.some((slot) => slot.cohortId === enrollment.cohortId),
            })}
          />
          <EnrollmentDetails
            enrollment={enrollment}
            courseName={course?.nombre ?? null}
            cohortName={cohortName}
            identity={overview.identity}
            state={principal}
            payment={ownPayment}
            hoursPerDay={ownReservation?.plan?.horasPorDia ?? null}
          />
        </div>
      )}
      <nav className={styles.quickActions} aria-label="Acciones de tu inscripción">
        <Link className={buttonClassName("primary")} href="/student/schedule">
          <EnrollmentIcon kind="calendar" />
          Ir a mis horarios
        </Link>
        <Link className={buttonClassName("secondary")} href="/student/documents">
          <EnrollmentIcon kind="document" />
          Ver mis documentos
        </Link>
        <Link className={buttonClassName("secondary")} href="/student/change-password">
          <EnrollmentIcon kind="access" />
          Cambiar contraseña
        </Link>
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName("secondary")}
        >
          <EnrollmentIcon kind="whatsapp" className={`${styles.icon} ${styles.whatsapp}`} />
          Contactar a la escuela
        </a>
      </nav>
    </div>
  );
}
