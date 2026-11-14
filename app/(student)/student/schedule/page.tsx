"use client";

import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
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
import type { PracticeBlockOption, PracticeBlockResolution } from "@/types/practiceBlock";
import { usePracticeBlocks } from "@/components/practice-blocks/PracticeBlockProvider";
import { BlockDialog, TakeBlockDialog, type AgendaBlock } from "./BlockDialogs";
import { NextPractice, ScheduleAgenda } from "./ScheduleAgenda";
import { PracticePlan } from "./PracticePlan";
import { PracticeBadge, ScheduleIcon, ScheduleSkeleton } from "./ScheduleVisual";
import {
  dateLabel,
  dayKey,
  downloadCalendar,
  friendlyError,
  groupSlots,
  hoursLabel,
  instructorName,
  isActive,
  isPlanConfigurationError,
  slotEnd,
  timeLabel,
  visualState,
  type PracticeBlock,
  type VisualState,
} from "./scheduleModel";
import { usePracticePlan } from "./usePracticePlan";
import styles from "./schedule.module.css";

const historyStates: Record<PracticeHistoryItem["estado"], VisualState> = {
  asistio: { label: "Asistió", tone: "complete", icon: "check" },
  no_asistio: { label: "No asistió", tone: "error", icon: "cross" },
  pendiente: { label: "Asistencia pendiente", tone: "neutral", icon: "clock" },
  liberada: { label: "Hora liberada", tone: "warning", icon: "clock" },
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
  const availability = usePracticeBlocks();
  const { summary, options, loading: optionsLoading, summaryError, optionsError } = availability;
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
  const [dialog, setDialog] = useState<AgendaBlock | null>(null);
  const [take, setTake] = useState<PracticeBlockOption | null>(null);
  const [successNotice, setSuccessNotice] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [planReload, setPlanReload] = useState(0);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const workspace = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refreshTime = () => setCurrentTime(Date.now());
    const openAvailable = () => {
      if (window.location.hash === "#cupos-disponibles") setSection("available");
    };
    const initialRefresh = window.setTimeout(() => {
      refreshTime();
      openAvailable();
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
    window.addEventListener("hashchange", openAvailable);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshTime);
      window.removeEventListener("hashchange", openAvailable);
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
  // Los avisos de cohorte actualizan primero el resumen compartido; la agenda lo sigue.
  useEffect(() => {
    if (summary) refetchSlots();
  }, [summary, refetchSlots]);

  const userId = useCurrentUserId();
  function refreshAll() {
    refetchSlots();
    void availability.refresh();
    setPlanReload((value) => value + 1);
  }
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

  // Solo los cupos liberados por otros alumnos; los bloques libres del instructor
  // aparecen únicamente en el selector de reposición.
  const releasedGroups = (() => {
    const groups = new Map<string, PracticeBlockOption[]>();
    for (const option of options) {
      if (
        option.kind !== "released" ||
        (cohortId && option.cohortId !== cohortId) ||
        (currentTime !== null && Date.parse(option.startsAt) - currentTime <= 300000)
      )
        continue;
      const key = `${option.enrollmentId}:${option.startsAt}:${option.instructorId}:${option.hours}`;
      groups.set(key, [...(groups.get(key) ?? []), option]);
    }
    return [...groups.values()].sort(
      (a, b) => Date.parse(a[0].startsAt) - Date.parse(b[0].startsAt),
    );
  })();
  const planSummary = summary?.enrollments.find((item) => item.cohortId === cohortId) ?? null;
  const usedChanges = planSummary?.used ?? null;
  const releasedLoading = optionsLoading && !options.length;
  const invalidPlan =
    configurationIssue ||
    [optionsError, summaryError].some(isPlanConfigurationError) ||
    Boolean(
      history?.data &&
      (history.data.summary.horasObjetivo === null || history.data.summary.horasObjetivo <= 0),
    );
  const listErrors = [optionsError].filter(
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

  // Cada acción de la agenda opera sobre el bloque completo del día.
  function agendaFor(block: PracticeBlock | undefined): AgendaBlock | null {
    if (!block) return null;
    const first = block.slots[0];
    const enrollment = summary?.enrollments.find((item) => item.cohortId === first.cohortId);
    if (!enrollment) return null;
    const instructorId = "instructorId" in first ? first.instructorId : "";
    const sameDay = upcoming.filter(
      (slot) => slot.cohortId === first.cohortId && dayKey(slot.scheduledAt) === block.day,
    ).length;
    return {
      enrollmentId: enrollment.id,
      cohortId: first.cohortId,
      date: block.day,
      slotIds: block.slots.map((slot) => slot.id),
      startsAt: first.scheduledAt,
      endsAt: new Date(block.end).toISOString(),
      hours: block.slots.length,
      instructorId,
      instructorName: instructorName(first),
      confirmed: block.slots.every((slot) => slot.status === "confirmado"),
      started: currentTime === null || block.start <= currentTime,
      valid: block.slots.length <= 2 && instructorId !== "" && sameDay === block.slots.length,
      status: "",
    };
  }
  const blockOfSlot = (slotId: string) =>
    blocks.find((block) => block.slots.some((slot) => slot.id === slotId));
  function openDialog(block: PracticeBlock | undefined, trigger?: HTMLButtonElement) {
    if (trigger) dialogTrigger.current = trigger;
    const agenda = agendaFor(block);
    if (!agenda) {
      setActionError("Todavía estamos consultando tu plan. Inténtalo de nuevo en unos segundos.");
      return;
    }
    setActionError(null);
    setDialog(agenda);
  }
  async function handleConfirm(slotId: string) {
    const block = blockOfSlot(slotId);
    const agenda = agendaFor(block);
    if (!agenda || !agenda.valid) {
      openDialog(block);
      return;
    }
    setActionError(null);
    setPendingSlotId(slotId);
    try {
      await api.post(`/practice-slots/blocks/${agenda.enrollmentId}/${agenda.date}/confirm`);
      setSuccessNotice("Listo, confirmaste tu asistencia. ¡Te esperamos!");
    } catch (err) {
      setActionError(friendlyError(err, "No se pudo confirmar tu asistencia. Inténtalo de nuevo."));
    } finally {
      setPendingSlotId(null);
      refreshAll();
    }
  }
  async function handleDialogDone(result: PracticeBlockResolution) {
    setDialog(null);
    setActionError(null);
    setSuccessNotice(result.effect);
    restoreFocus(dialogTrigger.current);
    refreshAll();
  }
  function chooseOption(group: PracticeBlockOption[], trigger?: HTMLButtonElement) {
    if (trigger) dialogTrigger.current = trigger;
    setActionError(null);
    setTake(group[0]);
  }
  function handleTaken() {
    setTake(null);
    setSuccessNotice("Listo, cambiaste tu bloque por el cupo liberado.");
    restoreFocus(dialogTrigger.current);
    refreshAll();
    return Promise.resolve();
  }
  const actions = {
    now: currentTime,
    pendingSlotId,
    onConfirm: (id: string) => {
      void handleConfirm(id);
    },
    onCancel: (id: string, trigger: HTMLButtonElement) => {
      openDialog(blockOfSlot(id), trigger);
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
                  <StudentEmptyState
                    title="Aún no tienes prácticas asignadas"
                    description="Cuando la escuela confirme tu horario, encontrarás aquí las fechas y tus próximas clases."
                  />
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
                    {!releasedLoading && !optionsError ? (
                      <span>({releasedGroups.length})</span>
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
                        onOptions={(block, trigger) => openDialog(block, trigger)}
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
                  <section
                    id="cupos-disponibles"
                    tabIndex={-1}
                    className={styles.available}
                    aria-label="Cupos disponibles"
                  >
                    <h2>Encuentra otro horario</h2>
                    <p className={styles.hint}>
                      Solo aparecen los cupos liberados por otros alumnos el mismo día de uno de tus
                      bloques y con tu mismo instructor.
                    </p>
                    {listErrors.length ? (
                      <div className={styles.inlineError}>
                        <p>No pudimos actualizar los cupos que puedes cambiar.</p>
                        <Button variant="ghost" onClick={retry}>
                          Reintentar
                        </Button>
                      </div>
                    ) : null}
                    {releasedLoading ? (
                      [1, 2].map((id) => (
                        <div key={id} className={`${styles.skeleton} ${styles.rowSkeleton}`} />
                      ))
                    ) : optionsError ? (
                      <p className={styles.emptyAgenda}>
                        {invalidPlan
                          ? "Los cupos para cambiar de horario estarán disponibles cuando la escuela termine de configurar tu plan."
                          : "Vuelve a intentarlo para consultar los cupos actualizados."}
                      </p>
                    ) : !releasedGroups.length ? (
                      <p className={styles.emptyAgenda}>
                        No hay cupos liberados por ahora. Tu agenda se actualiza cuando aparece uno
                        disponible.
                      </p>
                    ) : (
                      releasedGroups.map((group) => {
                        const option = group[0];
                        return (
                          <article
                            className={styles.availableSlot}
                            data-tone="info"
                            key={`${option.enrollmentId}-${option.startsAt}-${option.instructorId}`}
                          >
                            <div>
                              <PracticeBadge
                                state={{
                                  label: "Cupo disponible",
                                  tone: "info",
                                  icon: "clock",
                                }}
                              />
                              <p className={styles.panelDate}>
                                {dateLabel(option.startsAt, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                              <strong>
                                {timeLabel(option.startsAt)} – {timeLabel(option.endsAt)}
                              </strong>
                              <p className={styles.hint}>
                                {option.hours} h · {option.instructorName}
                              </p>
                              <p className={styles.hint}>
                                Cambiar tu bloque{" "}
                                {option.sourceStartsAt
                                  ? `${timeLabel(option.sourceStartsAt)} – ${timeLabel(Date.parse(option.sourceStartsAt) + option.hours * 3600000)}`
                                  : ""}{" "}
                                por {timeLabel(option.startsAt)} – {timeLabel(option.endsAt)} ·
                                consume 1 reprogramación; te quedará {option.remaining}.
                              </p>
                            </div>
                            <Button
                              className={styles.primaryAction}
                              disabled={pendingSlotId !== null}
                              onClick={(event) => chooseOption(group, event.currentTarget)}
                            >
                              Tomar cupo
                            </Button>
                          </article>
                        );
                      })
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
                usedChanges={usedChanges}
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
        {dialog ? (
          <BlockDialog
            key={`${dialog.enrollmentId}:${dialog.date}`}
            block={dialog}
            onClose={() => {
              setDialog(null);
              restoreFocus(dialogTrigger.current);
            }}
            onDone={handleDialogDone}
          />
        ) : null}
        {take ? (
          <TakeBlockDialog
            key={take.id}
            option={take}
            onClose={() => {
              setTake(null);
              restoreFocus(dialogTrigger.current);
            }}
            onDone={handleTaken}
          />
        ) : null}
      </div>
    </MotionConfig>
  );
}
