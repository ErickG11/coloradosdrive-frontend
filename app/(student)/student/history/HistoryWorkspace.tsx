"use client";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Button, EmptyState } from "@/components/ui";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import type { StudentPracticeSlot } from "@/types";
import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import type { PendingPracticeRating } from "@/types/practiceRating";
import { useHistoryData } from "./useHistoryData";
import {
  dateKey,
  enrich,
  isUpcoming,
  matchesFilter,
  matchesRange,
  type Filter,
  type Range,
  type HistoryBlock,
} from "./historyModel";
import { HistoryIcon, HistorySkeleton } from "./HistoryVisual";
import { HistorySummary } from "./HistorySummary";
import { HistoryRail } from "./HistoryRail";
import { HistoryFilters, HistoryTimeline } from "./HistoryTimeline";
import { HistoryDetail } from "./HistoryDetail";
import styles from "./history.module.css";

export function HistoryWorkspace({
  enrollment,
  slots,
  pendingRatings,
  onRate,
  onRefreshAuxiliary,
}: {
  enrollment: PracticeHistoryEnrollment;
  slots: StudentPracticeSlot[];
  pendingRatings: PendingPracticeRating[];
  onRate: (rating: PendingPracticeRating, returnTo?: HTMLElement) => void;
  onRefreshAuxiliary: () => void;
}) {
  const history = useHistoryData(enrollment.enrollmentId);
  const [now, setNow] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState<Range>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistoryBlock | null>(null);
  const [limit, setLimit] = useState(40);
  const [keyboard, setKeyboard] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const timelineHeading = useRef<HTMLHeadingElement | null>(null);
  const refetch = history.refetch;
  const refresh = useCallback(() => {
    refetch();
    onRefreshAuxiliary();
  }, [refetch, onRefreshAuxiliary]);
  const userId = useCurrentUserId();
  useRealtimeChannel(userId ? `user-${userId}-practice-slots` : null, {
    "slots-updated": refresh,
    "confirmation-requested": refresh,
    "no-practice": refresh,
  });
  useRealtimeChannel(
    enrollment.status === "activo" && enrollment.cohortId
      ? `cohort-${enrollment.cohortId}-practice-slots`
      : null,
    { "slot-released": refresh, "slot-taken": refresh },
  );
  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    const initial = window.setTimeout(updateTime, 0);
    const clock = window.setInterval(updateTime, 30000);
    const resume = () => {
      updateTime();
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(clock);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [refresh]);
  const entries = enrich(history.data?.items ?? [], slots, enrollment.cohortId);
  const upcoming = entries.filter((entry) => isUpcoming(entry, now));
  const scheduledMinutes =
    history.complete && now !== null && upcoming.every((item) => item.durationMinutes !== null)
      ? upcoming.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0)
      : null;
  const inRange = entries.filter(
    (item) =>
      matchesRange(item, range, now) && (!selectedDay || dateKey(item.scheduledAt) === selectedDay),
  );
  const filtered = inRange.filter((item) => matchesFilter(item, filter, now));
  const elapsed =
    history.updatedAt !== null && now !== null
      ? Math.max(0, Math.floor((now - history.updatedAt) / 60000))
      : 0;
  function chooseDay(day: string) {
    setSelectedDay(day);
    setRange("all");
    setFilter("all");
    setLimit(40);
    setKeyboard(true);
    requestAnimationFrame(() => {
      const heading = timelineHeading.current;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
      else timelineHeading.current?.focus();
    });
  }
  const selectedDetail = detail
    ? {
        ...detail,
        entries: detail.entries.map(
          (item) => entries.find((entry) => entry.id === item.id) ?? item,
        ),
      }
    : null;
  if (history.data === null && !history.error) return <HistorySkeleton />;
  if (!history.data || history.errorStatus === 409)
    return (
      <EmptyState
        error
        title={
          history.errorStatus === 409
            ? "Tu historial necesita revisión"
            : "No pudimos cargar tu historial"
        }
        description={
          history.errorStatus === 409
            ? "Hay matrículas en la misma cohorte y no podemos separar tus prácticas. Pide a la escuela que revise tu historial."
            : "Revisa tu conexión y vuelve a intentarlo."
        }
        action={
          <Button variant="secondary" onClick={refresh}>
            Reintentar historial
          </Button>
        }
      />
    );
  if (history.complete && entries.length === 0)
    return (
      <StudentEmptyState
        title="Aún no tienes prácticas en tu historial"
        description="Después de tus clases, aquí verás tu asistencia y las horas que vas completando."
      />
    );
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.workspaceBody}>
        <div className={styles.refreshRow}>
          <span>
            {history.isLoading
              ? "Actualizando…"
              : history.updatedAt === null
                ? "Historial disponible"
                : elapsed < 1
                  ? "Actualizado ahora"
                  : `Actualizado hace ${elapsed} min`}
          </span>
          <Button
            variant="ghost"
            aria-label="Actualizar historial"
            disabled={history.isLoading}
            aria-busy={history.isLoading || undefined}
            className={styles.refreshButton}
            onClick={refresh}
          >
            <HistoryIcon
              kind="refresh"
              className={history.isLoading ? styles.spinningIcon : styles.icon}
            />
          </Button>
        </div>
        {history.error ? (
          <div className={styles.inlineError} role="alert">
            <p>{history.error}</p>
            <Button variant="ghost" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        ) : null}
        <HistorySummary
          summary={history.data.summary}
          scheduledMinutes={scheduledMinutes}
          upcomingCount={history.complete && now !== null ? upcoming.length : null}
        />
        <div className={styles.layout}>
          <section className={styles.mainColumn} aria-label="Línea de tiempo de asistencia">
            <h2 ref={timelineHeading} tabIndex={-1} className={styles.timelineTitle}>
              Tus prácticas, en el tiempo
            </h2>
            <HistoryFilters
              entries={inRange}
              now={now}
              filter={filter}
              range={range}
              selectedDay={selectedDay}
              onFilter={(value, byKeyboard) => {
                setFilter(value);
                setLimit(40);
                setKeyboard(byKeyboard);
              }}
              onRange={(value) => {
                setRange(value);
                setSelectedDay(null);
                setLimit(40);
                setKeyboard(true);
              }}
              onClearDay={() => {
                setSelectedDay(null);
                setLimit(40);
              }}
            />
            <HistoryTimeline
              entries={filtered}
              now={now}
              filter={filter}
              pendingRatings={pendingRatings}
              limit={limit}
              onMore={() => setLimit((count) => count + 40)}
              keyboard={keyboard}
              onSelect={(block, button) => {
                trigger.current = button;
                setDetail(block);
              }}
              onRate={onRate}
            />
          </section>
          <HistoryRail
            entries={entries}
            now={now}
            selectedDay={selectedDay}
            complete={history.complete}
            onDay={chooseDay}
          />
        </div>
        {selectedDetail ? (
          <HistoryDetail
            block={selectedDetail}
            now={now}
            pendingRatings={pendingRatings}
            onClose={() => {
              setDetail(null);
              restoreFocus();
            }}
            onRate={(rating) => {
              setDetail(null);
              onRate(rating, trigger.current ?? undefined);
            }}
          />
        ) : null}
      </div>
    </MotionConfig>
  );
}
