"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { Button, FormError } from "@/components/ui";
import { XIcon } from "@/components/ui/icons";
import { Toast } from "@/components/inscripcion/Toast";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useFetch } from "@/hooks/useFetch";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { api } from "@/lib/api/client";
import type { StudentPracticeSlot } from "@/types";
import type { PracticeHistoryEnrollment, PracticeHistoryItem } from "@/types/practiceAttendance";
import type {
  CancellationPreview,
  CancelPracticeSlotResult,
  PendingPracticeSlot,
  ReleasedPracticeSlot,
  SwapPracticeResult,
} from "@/types/practiceSlot";
import { CancelPracticeModal, cancellationConsequence } from "./CancelPracticeModal";
import { SwapPracticeModal } from "./SwapPracticeModal";
import { NextPractice, ScheduleAgenda } from "./ScheduleAgenda";
import { PracticePlan } from "./PracticePlan";
import { PracticeBadge, ScheduleIcon, ScheduleSkeleton } from "./ScheduleVisual";
import {
  dateLabel,
  downloadCalendar,
  friendlyError,
  groupSlots,
  hoursLabel,
  isActive,
  isPlanConfigurationError,
  slotEnd,
  timeLabel,
  visualState,
  type VisualState,
} from "./scheduleModel";
import { usePracticePlan } from "./usePracticePlan";
import styles from "./schedule.module.css";

const historyStates: Record<PracticeHistoryItem["estado"], VisualState> = {
  asistio: { label: "Asistió", tone: "complete", icon: "check" },
  no_asistio: { label: "No asistió", tone: "error", icon: "cross" },
  pendiente: { label: "Asistencia pendiente", tone: "neutral", icon: "clock" },
  liberada: { label: "Pendiente por reponer", tone: "warning", icon: "clock" },
  falta: { label: "Falta", tone: "error", icon: "cross" },
  cancelada: { label: "Cancelada", tone: "neutral", icon: "cross", cancelled: true },
};

export default function StudentSchedulePage() {
  const {
    data: slots,
    isLoading,
    error,
    refetch: refetchSlots,
  } = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const {
    data: releasedSlots,
    isLoading: releasedLoading,
    error: releasedError,
    refetch: refetchReleased,
  } = useFetch<ReleasedPracticeSlot[]>("/practice-slots/released-for-me");
  const {
    data: pendingPractices,
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useFetch<PendingPracticeSlot[]>("/practice-slots/my-pending");
  const {
    data: enrollments,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useFetch<{ cohortId: string | null; courseType: "A" | "B" }[]>("/estudiantes/enrollments");
  const {
    data: planEnrollments,
    error: planEnrollmentsError,
    refetch: refetchPlanEnrollments,
  } = useFetch<PracticeHistoryEnrollment[]>("/estudiantes/practice-history/enrollments");
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "week">("list");
  const [section, setSection] = useState<"agenda" | "available">("agenda");
  const [planNoticeDismissed, setPlanNoticeDismissed] = useState(false);
  const [focusedDay, setFocusedDay] = useState<{ day: string; request: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [configurationIssue, setConfigurationIssue] = useState(false);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [confirmationDue, setConfirmationDue] = useState(false);
  const [noPracticeNotice, setNoPracticeNotice] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    slotId: string;
    preview: CancellationPreview;
  } | null>(null);
  const [swapTarget, setSwapTarget] = useState<ReleasedPracticeSlot | null>(null);
  const [knownRemaining, setKnownRemaining] = useState<Record<string, number>>({});
  const [successNotice, setSuccessNotice] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [planReload, setPlanReload] = useState(0);
  const cancelTrigger = useRef<HTMLButtonElement | null>(null);
  const swapTrigger = useRef<HTMLButtonElement | null>(null);
  const workspace = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refreshTime = () => setCurrentTime(Date.now());
    const initialRefresh = window.setTimeout(() => {
      refreshTime();
      try {
        if (localStorage.getItem("coloradosdrive:practice-view:v1") === "week") setView("week");
        if (sessionStorage.getItem("coloradosdrive:practice-plan-notice:v1") === "dismissed")
          setPlanNoticeDismissed(true);
      } catch {
        /* Storage is optional. */
      }
    }, 0);
    const refreshInterval = window.setInterval(refreshTime, 15000);
    window.addEventListener("focus", refreshTime);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshTime);
    };
  }, []);

  const cohortOptions = (enrollments ?? []).filter((item) => item.cohortId !== null);
  const cohortId =
    cohortOptions.find((item) => item.cohortId === selectedCohort)?.cohortId ??
    cohortOptions[0]?.cohortId ??
    slots?.find((slot) => slot.studentId !== null)?.cohortId ??
    null;
  const planEnrollment = planEnrollments?.find(
    (item) => item.status === "activo" && item.cohortId === cohortId,
  );
  const history = usePracticePlan(planEnrollment?.enrollmentId ?? null, slots, planReload);
  const ownSlots = (slots ?? []).filter(
    (slot) => slot.studentId !== null && (!cohortId || slot.cohortId === cohortId),
  );
  const upcoming = ownSlots.filter(
    (slot) => isActive(slot) && (currentTime === null || slotEnd(slot) > currentTime),
  );
  const past = ownSlots.filter(
    (slot) => !isActive(slot) || (currentTime !== null && slotEnd(slot) <= currentTime),
  );
  const blocks = groupSlots(upcoming);
  const nextBlock = blocks[0];
  const counterSlotId =
    upcoming.find((slot) => currentTime !== null && Date.parse(slot.scheduledAt) > currentTime)
      ?.id ?? null;
  useEffect(() => {
    if (!counterSlotId || !cohortId) return;
    let active = true;
    api
      .get<CancellationPreview>(`/practice-slots/${counterSlotId}/cancel-preview`)
      .then((preview) => {
        if (active && typeof preview?.reprogramacionesRestantes === "number")
          setKnownRemaining((values) => ({
            ...values,
            [cohortId]: preview.reprogramacionesRestantes,
          }));
      })
      .catch(() => {
        /* The list or the next successful action may supply the count. */
      });
    return () => {
      active = false;
    };
  }, [counterSlotId, cohortId, slots]);

  const userId = useCurrentUserId();
  const cohortA = enrollments?.find((item) => item.courseType === "A")?.cohortId ?? null;
  const cohortB = enrollments?.find((item) => item.courseType === "B")?.cohortId ?? null;
  function refreshAll() {
    refetchSlots();
    refetchReleased();
    refetchPending();
    setPlanReload((value) => value + 1);
  }
  useRealtimeChannel(cohortA ? `cohort-${cohortA}-practice-slots` : null, {
    "slot-released": refreshAll,
    "slot-taken": refreshAll,
  });
  useRealtimeChannel(cohortB ? `cohort-${cohortB}-practice-slots` : null, {
    "slot-released": refreshAll,
    "slot-taken": refreshAll,
  });
  useRealtimeChannel(userId ? `user-${userId}-practice-slots` : null, {
    "confirmation-requested": () => {
      setConfirmationDue(true);
      refreshAll();
    },
    "no-practice": () => {
      setNoPracticeNotice(true);
      refreshAll();
    },
    "slots-updated": refreshAll,
  });

  const availableSlots = (releasedSlots ?? [])
    .filter(
      (slot) =>
        (!cohortId || slot.cohortId === cohortId) &&
        (currentTime === null || Date.parse(slot.scheduledAt) - currentTime > 300000),
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const counts = new Set(availableSlots.map((slot) => slot.reprogramacionesRestantes));
  const remaining =
    counts.size === 1
      ? availableSlots[0].reprogramacionesRestantes
      : counts.size > 1
        ? null
        : cohortId
          ? (knownRemaining[cohortId] ?? null)
          : null;
  const invalidPlan =
    configurationIssue ||
    [releasedError, pendingError].some(isPlanConfigurationError) ||
    Boolean(
      history?.data &&
      (history.data.summary.horasObjetivo === null || history.data.summary.horasObjetivo <= 0),
    );
  const listErrors = [releasedError, pendingError].filter(
    (message): message is string => Boolean(message) && !isPlanConfigurationError(message),
  );
  const pastHistory = (history?.data?.items ?? []).filter(
    (item) =>
      item.estado !== "pendiente" ||
      (currentTime !== null &&
        Date.parse(item.scheduledAt) + (item.durationMinutes ?? 60) * 60000 <= currentTime),
  );
  const historyIds = new Set(pastHistory.map((item) => item.practiceSlotId));
  const pastOwn = past.filter((slot) => !historyIds.has(slot.id));

  function changeView(value: "list" | "week") {
    setView(value);
    try {
      localStorage.setItem("coloradosdrive:practice-view:v1", value);
    } catch {
      /* Convenience only. */
    }
  }
  function navigateToDay(day: string) {
    setSection("agenda");
    setFocusedDay((previous) => ({ day, request: (previous?.request ?? 0) + 1 }));
    window.requestAnimationFrame(() => {
      const target = document.getElementById(
        view === "list" ? `practice-day-${day}` : "practice-week",
      );
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      if (view === "week")
        document
          .getElementById(`practice-week-day-${day}`)
          ?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "center" });
    });
  }
  function retry() {
    setConfigurationIssue(false);
    refreshAll();
    refetchEnrollments();
    refetchPlanEnrollments();
  }
  function restoreFocus(trigger: HTMLButtonElement | null) {
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
      else workspace.current?.focus();
    });
  }
  function rememberRemaining(value: number) {
    if (cohortId) setKnownRemaining((counts) => ({ ...counts, [cohortId]: value }));
  }
  async function handleConfirm(slotId: string) {
    setActionError(null);
    setPendingSlotId(slotId);
    try {
      await api.post(`/practice-slots/${slotId}/confirm`);
      setSuccessNotice("Listo, confirmaste tu asistencia. ¡Te esperamos!");
    } catch (err) {
      setActionError(friendlyError(err, "No se pudo confirmar tu asistencia. Inténtalo de nuevo."));
    } finally {
      setPendingSlotId(null);
      refreshAll();
    }
  }
  async function handleCancelPreview(slotId: string, trigger: HTMLButtonElement) {
    cancelTrigger.current = trigger;
    setActionError(null);
    setPendingSlotId(slotId);
    try {
      const preview = await api.get<CancellationPreview>(
        `/practice-slots/${slotId}/cancel-preview`,
      );
      rememberRemaining(preview.reprogramacionesRestantes);
      setCancelTarget({ slotId, preview });
    } catch (err) {
      if (err instanceof Error && isPlanConfigurationError(err.message))
        setConfigurationIssue(true);
      else
        setActionError(
          friendlyError(err, "No se pudo revisar tu aviso de inasistencia. Inténtalo de nuevo."),
        );
      restoreFocus(trigger);
      refetchSlots();
    } finally {
      setPendingSlotId(null);
    }
  }
  function handleCancelled(result: CancelPracticeSlotResult) {
    setCancelTarget(null);
    setActionError(null);
    rememberRemaining(result.cancelacion.reprogramacionesRestantes);
    setSuccessNotice(
      `Listo, avisamos que no asistirás a esta práctica. ${cancellationConsequence(result.cancelacion.resultado)} Te quedan ${result.cancelacion.reprogramacionesRestantes} de 2 reprogramaciones.`,
    );
    restoreFocus(cancelTrigger.current);
    refreshAll();
  }
  function openSwap(slot: ReleasedPracticeSlot, trigger: HTMLButtonElement) {
    swapTrigger.current = trigger;
    setActionError(null);
    rememberRemaining(slot.reprogramacionesRestantes);
    setSwapTarget(slot);
  }
  function handleSwapped(result: SwapPracticeResult) {
    setSwapTarget(null);
    rememberRemaining(result.reprogramacionesRestantes);
    setSuccessNotice("Listo, cambiaste tu horario");
    restoreFocus(swapTrigger.current);
    refreshAll();
  }
  const actions = {
    now: currentTime,
    pendingSlotId,
    onConfirm: (id: string) => {
      void handleConfirm(id);
    },
    onCancel: (id: string, trigger: HTMLButtonElement) => {
      void handleCancelPreview(id, trigger);
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={workspace} tabIndex={-1} className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <h1>Mis prácticas</h1>
            <p>Tu próxima hora al volante, y todo lo que viene después.</p>
          </div>
          <div className={styles.headerTools}>
            {cohortOptions.length > 1 ? (
              <label className={styles.cohortSelect}>
                Mi cohorte
                <select
                  aria-label="Plan de prácticas"
                  value={cohortId ?? ""}
                  disabled={pendingSlotId !== null}
                  onChange={(event) => {
                    setSelectedCohort(event.target.value);
                    setActionError(null);
                    setConfigurationIssue(false);
                  }}
                >
                  {cohortOptions.map((item) => (
                    <option key={item.cohortId} value={item.cohortId ?? ""}>
                      Licencia {item.courseType}
                    </option>
                  ))}
                </select>
              </label>
            ) : cohortOptions[0] ? (
              <span className={styles.cohortChip}>
                Licencia {cohortOptions[0].courseType} · Mi cohorte
              </span>
            ) : null}
            <div className={styles.segmented} role="group" aria-label="Vista de la agenda">
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => changeView("list")}
              >
                Lista
              </button>
              <button
                type="button"
                aria-pressed={view === "week"}
                onClick={() => changeView("week")}
              >
                Semana
              </button>
            </div>
          </div>
        </header>
        {invalidPlan && !planNoticeDismissed ? (
          <div className={styles.planNotice} role="status">
            <ScheduleIcon kind="info" />
            <p>
              Estamos terminando de configurar tu plan. Tus prácticas asignadas siguen disponibles.
            </p>
            <button
              type="button"
              className={styles.noticeClose}
              aria-label="Cerrar aviso del plan durante esta sesión"
              onClick={() => {
                setPlanNoticeDismissed(true);
                try {
                  sessionStorage.setItem("coloradosdrive:practice-plan-notice:v1", "dismissed");
                } catch {
                  /* Dismissal still applies to this visit. */
                }
              }}
            >
              <XIcon className={styles.smallIcon} />
            </button>
          </div>
        ) : null}
        {enrollmentsError ? (
          <div className={styles.inlineError}>
            No pudimos consultar tu cohorte.
            <Button variant="ghost" onClick={refetchEnrollments}>
              Reintentar
            </Button>
          </div>
        ) : null}
        {actionError ? <FormError>{actionError}</FormError> : null}
        <div className={styles.toast}>
          <Toast message={successNotice} onDismiss={() => setSuccessNotice("")} />
        </div>
        {noPracticeNotice ? (
          <div className={styles.planNotice}>
            <ScheduleIcon kind="info" />
            <p>Esta práctica ya no se realizará. Consulta tus horarios actualizados.</p>
            <Button variant="ghost" onClick={() => setNoPracticeNotice(false)}>
              Entendido
            </Button>
          </div>
        ) : null}
        {isLoading && slots === null ? (
          <ScheduleSkeleton />
        ) : error && slots === null ? (
          <section className={styles.empty}>
            <ScheduleIcon kind="calendar" />
            <h2>No pudimos cargar tus prácticas</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <Button variant="secondary" onClick={retry}>
              Reintentar
            </Button>
          </section>
        ) : (
          <>
            {error ? (
              <div className={styles.inlineError}>
                No pudimos actualizar tu agenda.
                <Button variant="ghost" onClick={retry}>
                  Reintentar
                </Button>
              </div>
            ) : null}
            <div className={styles.layout}>
              <div className={styles.main}>
                {nextBlock ? (
                  <NextPractice
                    block={nextBlock}
                    actions={actions}
                    following={blocks.slice(1)}
                    onNavigate={navigateToDay}
                  />
                ) : (
                  <section className={styles.empty}>
                    <ScheduleIcon />
                    <h2>Aún no tienes prácticas asignadas</h2>
                    <p>
                      Cuando la escuela asigne tu horario, lo encontrarás aquí. Si ya te
                      matriculaste, consulta con la escuela la fecha de inicio.
                    </p>
                  </section>
                )}
                <div
                  className={styles.sectionNav}
                  role="group"
                  aria-label="Secciones de mis prácticas"
                >
                  <button
                    type="button"
                    aria-pressed={section === "agenda"}
                    onClick={() => setSection("agenda")}
                  >
                    Mi agenda
                  </button>
                  <button
                    type="button"
                    aria-pressed={section === "available"}
                    onClick={() => setSection("available")}
                  >
                    Cupos disponibles{" "}
                    {!releasedLoading && !releasedError ? (
                      <span>({availableSlots.length})</span>
                    ) : null}
                  </button>
                </div>
                {section === "agenda" ? (
                  <section aria-label="Mi agenda" className={styles.agenda}>
                    <div className={styles.agendaHeading}>
                      <h2>Lo que viene</h2>
                      {blocks.length ? (
                        <Button
                          variant="ghost"
                          icon={<ScheduleIcon />}
                          onClick={() => downloadCalendar(blocks)}
                        >
                          Exportar agenda
                        </Button>
                      ) : null}
                    </div>
                    {confirmationDue ? (
                      <p className={styles.hint}>
                        Tu práctica está por empezar. Puedes confirmar si deseas; si no respondes,
                        igual te esperamos.
                      </p>
                    ) : null}
                    {blocks.length || view === "week" ? (
                      <ScheduleAgenda
                        blocks={blocks}
                        actions={actions}
                        view={view}
                        focusedDay={focusedDay}
                      />
                    ) : (
                      <p className={styles.emptyAgenda}>
                        Tu agenda está al día. Aquí aparecerán tus próximas prácticas.
                      </p>
                    )}
                    <details className={styles.previous}>
                      <summary>
                        Anteriores <span>({pastHistory.length + pastOwn.length})</span>
                      </summary>
                      {pastHistory.map((item) => (
                        <div key={item.id} className={styles.pastRow}>
                          <div>
                            <p>
                              {dateLabel(item.scheduledAt, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              · {timeLabel(item.scheduledAt)}
                            </p>
                            {item.durationMinutes !== null ? (
                              <span className={styles.hint}>
                                {hoursLabel(item.durationMinutes)}
                              </span>
                            ) : null}
                          </div>
                          <PracticeBadge state={historyStates[item.estado]} />
                        </div>
                      ))}
                      {pastOwn.map((slot) => (
                        <div key={slot.id} className={styles.pastRow}>
                          <span>
                            {dateLabel(slot.scheduledAt, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {timeLabel(slot.scheduledAt)}
                          </span>
                          <PracticeBadge state={visualState(slot, currentTime)} />
                        </div>
                      ))}
                      {!pastHistory.length && !pastOwn.length ? (
                        <p className={styles.hint}>
                          Tus prácticas anteriores aparecerán aquí. El historial completo conserva
                          también los avisos de inasistencia.
                        </p>
                      ) : null}
                      <Link href="/student/history" className={styles.textLink}>
                        Ver todo mi historial
                        {history?.data && history.data.total > history.data.items.length
                          ? ` (${history.data.total})`
                          : ""}
                      </Link>
                    </details>
                  </section>
                ) : (
                  <section className={styles.available} aria-label="Cupos disponibles">
                    <h2>Encuentra otro horario</h2>
                    <p className={styles.hint}>
                      Solo aparecen los cupos que puedes elegir para tu plan.
                    </p>
                    {listErrors.length ? (
                      <div className={styles.inlineError}>
                        <p>No pudimos actualizar los cupos o las prácticas que puedes cambiar.</p>
                        <Button variant="ghost" onClick={retry}>
                          Reintentar
                        </Button>
                      </div>
                    ) : null}
                    {releasedLoading && releasedSlots === null ? (
                      [1, 2].map((id) => (
                        <div key={id} className={`${styles.skeleton} ${styles.rowSkeleton}`} />
                      ))
                    ) : releasedError ? (
                      <p className={styles.emptyAgenda}>
                        {invalidPlan
                          ? "Los cupos para cambiar de horario estarán disponibles cuando la escuela termine de configurar tu plan."
                          : "Vuelve a intentarlo para consultar los cupos actualizados."}
                      </p>
                    ) : !availableSlots.length ? (
                      <p className={styles.emptyAgenda}>
                        No hay cupos liberados por ahora. Tu agenda se actualiza cuando aparece uno
                        disponible.
                      </p>
                    ) : (
                      availableSlots.map((slot) => (
                        <article
                          className={styles.availableSlot}
                          data-tone={slot.caso === "A" ? "warning" : "info"}
                          key={`${slot.enrollmentId}-${slot.id}`}
                        >
                          <div>
                            <PracticeBadge
                              state={{
                                label:
                                  slot.caso === "A" ? "Pendiente por reponer" : "Cupo disponible",
                                tone: slot.caso === "A" ? "warning" : "info",
                                icon: "clock",
                              }}
                            />
                            <p className={styles.panelDate}>
                              {dateLabel(slot.scheduledAt, {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <strong>
                              {timeLabel(slot.scheduledAt)} – {timeLabel(slotEnd(slot))}
                            </strong>
                            <p className={styles.hint}>
                              {hoursLabel(slot.durationMinutes)} ·{" "}
                              {slot.caso === "A"
                                ? "Reposición de hora pendiente"
                                : "Cambio de práctica"}
                            </p>
                            <p className={styles.hint}>
                              Te quedan {slot.reprogramacionesRestantes} de 2 reprogramaciones.
                            </p>
                          </div>
                          <Button
                            className={styles.primaryAction}
                            disabled={
                              pendingSlotId !== null ||
                              (slot.caso === "B" && (pendingLoading || pendingError !== null))
                            }
                            onClick={(event) => openSwap(slot, event.currentTarget)}
                          >
                            Tomar cupo
                          </Button>
                        </article>
                      ))
                    )}
                  </section>
                )}
              </div>
              <PracticePlan
                history={history?.data ?? null}
                assignedMinutes={ownSlots
                  .filter((slot) => isActive(slot) || slot.status === "completado")
                  .reduce((sum, slot) => sum + slot.durationMinutes, 0)}
                remainingPractices={upcoming.length}
                practiceStates={upcoming.map((slot) => visualState(slot, currentTime))}
                remainingChanges={remaining}
                invalidPlan={invalidPlan}
                loading={Boolean(planEnrollment && !history)}
                error={
                  history?.error ??
                  (planEnrollmentsError ? "No pudimos cargar el avance de tu plan." : null)
                }
                onRetry={retry}
              />
            </div>
          </>
        )}
        {cancelTarget ? (
          <CancelPracticeModal
            key={cancelTarget.slotId}
            slotId={cancelTarget.slotId}
            preview={cancelTarget.preview}
            onClose={() => {
              setCancelTarget(null);
              restoreFocus(cancelTrigger.current);
            }}
            onCancelled={handleCancelled}
          />
        ) : null}
        {swapTarget ? (
          <SwapPracticeModal
            key={swapTarget.id}
            slot={swapTarget}
            pending={pendingPractices ?? []}
            onClose={() => {
              setSwapTarget(null);
              restoreFocus(swapTrigger.current);
            }}
            onSwapped={handleSwapped}
            onConflict={refreshAll}
          />
        ) : null}
      </div>
    </MotionConfig>
  );
}
