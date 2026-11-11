"use client";

import { useCallback, useRef, useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { Toast } from "@/components/inscripcion/Toast";
import { PracticeRatingModal } from "@/components/practice-ratings/PracticeRatingModal";
import { useFetch } from "@/hooks/useFetch";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import type { StudentPracticeSlot } from "@/types";
import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import type { PendingPracticeRating } from "@/types/practiceRating";
import { HistoryWorkspace } from "./HistoryWorkspace";
import { HistorySkeleton } from "./HistoryVisual";
import styles from "./history.module.css";

const enrollmentLabels: Record<PracticeHistoryEnrollment["status"], string> = {
  activo: "Activa",
  pendiente_cohorte: "Pendiente de cohorte",
  finalizado: "Finalizada",
  retirado: "Retirada",
};

export default function StudentHistoryPage() {
  const pending = usePendingPracticeRatings();
  const enrollments = useFetch<PracticeHistoryEnrollment[]>(
    "/estudiantes/practice-history/enrollments",
  );
  const ownSlots = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<PendingPracticeRating | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState("");
  const ratingTrigger = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  const enrollment =
    enrollments.data?.find((item) => item.enrollmentId === selected) ?? enrollments.data?.[0];
  const refreshSlots = ownSlots.refetch;
  const refreshRatings = pending.refetch;
  const refreshEnrollments = enrollments.refetch;
  const refreshAuxiliary = useCallback(() => {
    refreshSlots();
    refreshRatings();
    refreshEnrollments();
  }, [refreshSlots, refreshRatings, refreshEnrollments]);
  function rate(practice: PendingPracticeRating, returnTo?: HTMLElement) {
    ratingTrigger.current =
      returnTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setRatingSuccess("");
    setSelectedRating(practice);
  }
  function closeRating() {
    setSelectedRating(null);
    requestAnimationFrame(() => {
      if (ratingTrigger.current?.isConnected) ratingTrigger.current.focus();
      else title.current?.focus();
    });
  }
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <h1 ref={title} tabIndex={-1}>
            Mi historial de asistencia
          </h1>
          <p>Tus horas de práctica y cómo van contando para tu certificación.</p>
        </div>
        {enrollment ? (
          <div className={styles.enrollmentChip} data-enrollment={enrollment.status}>
            <i aria-hidden="true" />
            {(enrollments.data?.length ?? 0) > 1 ? (
              <label>
                <span className="sr-only">Matrícula</span>
                <select
                  value={enrollment.enrollmentId}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {enrollments.data!.map((item, index) => (
                    <option key={item.enrollmentId} value={item.enrollmentId}>
                      Curso tipo {item.courseType} · {enrollmentLabels[item.status]} · Matrícula{" "}
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span>
                Curso tipo {enrollment.courseType} · {enrollmentLabels[enrollment.status]}
              </span>
            )}
          </div>
        ) : null}
      </header>
      <div className={styles.toast}>
        <Toast message={ratingSuccess} onDismiss={() => setRatingSuccess("")} />
      </div>
      {pending.error ? (
        <div className={styles.inlineError} role="alert">
          <p>No pudimos consultar tus encuestas pendientes.</p>
          <Button variant="ghost" onClick={pending.refetch}>
            Reintentar encuestas
          </Button>
        </div>
      ) : null}
      {enrollments.error && enrollment ? (
        <div className={styles.inlineError} role="alert">
          <p>No pudimos actualizar tus matrículas. Se muestra la última consulta disponible.</p>
          <Button variant="ghost" onClick={enrollments.refetch}>
            Reintentar matrículas
          </Button>
        </div>
      ) : null}
      {enrollments.isLoading && enrollments.data === null ? (
        <HistorySkeleton />
      ) : enrollments.error && !enrollment ? (
        <EmptyState
          error
          title="No se pudieron cargar tus matrículas"
          description="Inténtalo de nuevo para consultar tu historial."
          action={
            <Button variant="secondary" onClick={enrollments.refetch}>
              Reintentar matrículas
            </Button>
          }
        />
      ) : !enrollment ? (
        <EmptyState
          title="Aún no tienes matrículas"
          description="Tu historial aparecerá cuando tengas una matrícula."
        />
      ) : (
        <HistoryWorkspace
          key={enrollment.enrollmentId}
          enrollment={enrollment}
          slots={ownSlots.data ?? []}
          pendingRatings={pending.items}
          onRate={rate}
          onRefreshAuxiliary={refreshAuxiliary}
        />
      )}
      <PracticeRatingModal
        practice={selectedRating}
        onClose={closeRating}
        onSubmitted={() => {
          closeRating();
          setRatingSuccess("Gracias, tu calificación se envió correctamente.");
          pending.refetch();
        }}
        onStale={pending.refetch}
      />
    </div>
  );
}
