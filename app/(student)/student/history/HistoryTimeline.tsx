"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import type { PendingPracticeRating } from "@/types/practiceRating";
import {
  filterLabels,
  formatDate,
  formatTime,
  groupHistory,
  hours,
  isUpcoming,
  matchesFilter,
  relativeDay,
  stateOf,
  type Filter,
  type Range,
  type HistoryEntry,
  type HistoryBlock,
} from "./historyModel";
import { HistoryBadge, HistoryIcon, HistoryStateIcon, Instructor } from "./HistoryVisual";
import styles from "./history.module.css";

export function HistoryFilters({
  entries,
  now,
  filter,
  range,
  selectedDay,
  onFilter,
  onRange,
  onClearDay,
}: {
  entries: HistoryEntry[];
  now: number | null;
  filter: Filter;
  range: Range;
  selectedDay: string | null;
  onFilter: (filter: Filter, keyboard: boolean) => void;
  onRange: (range: Range) => void;
  onClearDay: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bar.current,
      parent = element?.parentElement;
    if (!element || !parent || !("ResizeObserver" in window)) return;
    const observer = new ResizeObserver(() =>
      parent.style.setProperty(
        "--history-filter-height",
        `${element.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      parent.style.removeProperty("--history-filter-height");
    };
  }, []);
  return (
    <div ref={bar} className={styles.filters}>
      <div
        className={styles.filterScroll}
        role="group"
        aria-label="Filtrar prácticas por asistencia"
      >
        {(Object.keys(filterLabels) as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={(event) => onFilter(key, event.detail === 0)}
          >
            {filterLabels[key]}
            <span>{entries.filter((item) => matchesFilter(item, key, now)).length}</span>
          </button>
        ))}
      </div>
      <div className={styles.rangeRow}>
        <div className={styles.rangeToggle} role="group" aria-label="Rango del historial">
          {(
            [
              ["all", "Todo"],
              ["month", "Este mes"],
              ["weeks", "Últimas 4 semanas"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={range === key}
              onClick={() => onRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={styles.timeNote}>Horas en hora de Ecuador</span>
      </div>
      {selectedDay ? (
        <div className={styles.daySelection}>
          <span>
            {formatDate(`${selectedDay}T12:00:00-05:00`, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button variant="ghost" onClick={onClearDay}>
            Ver todos los días
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const emptyCopy: Record<Filter, [string, string]> = {
  all: [
    "Aún no hay prácticas en esta selección",
    "Aquí verás tus horarios, asistencias y avisos de inasistencia. Puedes ampliar el rango o consultar otros días.",
  ],
  upcoming: [
    "No tienes prácticas próximas en esta selección",
    "Consulta Mis prácticas para ver tu agenda y los cupos disponibles.",
  ],
  attended: [
    "Aún no tienes asistencias registradas aquí",
    "Aparecerán cuando tu instructor registre que asististe. También puedes ampliar el rango de fechas.",
  ],
  missed: [
    "No hay inasistencias en esta selección",
    "Aquí aparecerán las prácticas registradas como No asistió o Falta.",
  ],
  cancelled: [
    "No hay cancelaciones ni horas perdidas aquí",
    "Aquí podrás consultar los avisos de inasistencia y las horas pendientes por reponer.",
  ],
};
export function HistoryTimeline({
  entries,
  now,
  filter,
  pendingRatings,
  onSelect,
  onRate,
  limit,
  onMore,
  keyboard,
}: {
  entries: HistoryEntry[];
  now: number | null;
  filter: Filter;
  pendingRatings: PendingPracticeRating[];
  onSelect: (block: HistoryBlock, trigger: HTMLButtonElement) => void;
  onRate: (rating: PendingPracticeRating) => void;
  limit: number;
  onMore: () => void;
  keyboard: boolean;
}) {
  const upcoming = groupHistory(
    entries.filter((item) => isUpcoming(item, now)),
    true,
  );
  const previous = groupHistory(
    entries.filter((item) => !isUpcoming(item, now)),
    false,
  );
  let shown = 0;
  const animatedDays = new Set(
    [
      ...new Set(upcoming.map((block) => `Próximas-${block.day}`)),
      ...new Set(previous.map((block) => `Historial-${block.day}`)),
    ].slice(0, 4),
  );
  return (
    <div
      id="history-timeline"
      className={styles.timeline}
      tabIndex={-1}
      data-keyboard={keyboard || undefined}
    >
      {!entries.length ? (
        <div className={styles.empty}>
          <HistoryIcon kind="calendar" />
          <h2>{emptyCopy[filter][0]}</h2>
          <p>{emptyCopy[filter][1]}</p>
        </div>
      ) : (
        <>
          {(
            [
              ["Próximas", upcoming],
              ["Historial", previous],
            ] as const
          ).map(([label, blocks]) => {
            const visible = blocks.slice(0, Math.max(0, limit - shown));
            shown += visible.length;
            const days = new Map<string, HistoryBlock[]>();
            for (const block of visible)
              days.set(block.day, [...(days.get(block.day) ?? []), block]);
            return blocks.length && visible.length ? (
              <section key={label} className={styles.timelineSection} aria-label={label}>
                <h2>
                  {label}
                  <span>{blocks.reduce((sum, block) => sum + block.entries.length, 0)}</span>
                </h2>
                <AnimatePresence initial={!keyboard} mode="popLayout">
                  {[...days].map(([day, dayBlocks], dayIndex) => (
                    <motion.section
                      key={`${label}-${day}`}
                      layout="position"
                      className={styles.timelineDay}
                      initial={
                        animatedDays.has(`${label}-${day}`) && !keyboard
                          ? { opacity: 0, transform: "translateY(4px)" }
                          : false
                      }
                      animate={{ opacity: 1, transform: "translateY(0)" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(dayIndex, 7) * 0.02 }}
                    >
                      <h3 className={styles.dayHeading}>
                        <time dateTime={day}>
                          {formatDate(dayBlocks[0].start, {
                            weekday: "short",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </time>
                        {relativeDay(day, now) ? (
                          <span className={styles.relativeChip}>{relativeDay(day, now)}</span>
                        ) : null}
                      </h3>
                      {dayBlocks.map((block) => (
                        <article
                          key={block.id}
                          className={styles.historyBlock}
                          data-state={stateOf(block.entries[0], now).tone}
                        >
                          <span className={styles.timelineNode} aria-hidden="true">
                            <HistoryStateIcon state={stateOf(block.entries[0], now)} />
                          </span>
                          <button
                            type="button"
                            className={styles.blockHeader}
                            onClick={(event) => onSelect(block, event.currentTarget)}
                            aria-label={`Ver detalle del ${formatDate(block.start, { day: "numeric", month: "long" })}, ${formatTime(block.start)}`}
                          >
                            <span className={styles.blockTime}>
                              {formatTime(block.start)}
                              {block.end !== null ? ` – ${formatTime(block.end)}` : ""}
                              {block.entries.every((item) => item.durationMinutes !== null) ? (
                                <small>
                                  {" "}
                                  ·{" "}
                                  {hours(
                                    block.entries.reduce(
                                      (sum, item) => sum + (item.durationMinutes ?? 0),
                                      0,
                                    ) / 60,
                                  )}{" "}
                                  h
                                </small>
                              ) : null}
                            </span>
                            {block.entries.length === 1 ? (
                              <HistoryBadge state={stateOf(block.entries[0], now)} />
                            ) : (
                              <span className={styles.detailHint}>Ver detalle</span>
                            )}
                          </button>
                          {block.entries[0].instructor ? (
                            <div className={styles.blockInstructor}>
                              <Instructor name={block.entries[0].instructor.name} compact />
                            </div>
                          ) : null}
                          {block.entries.map((item) => {
                            const rating = pendingRatings.find(
                              (rating) =>
                                rating.practiceSlotId === item.practiceSlotId &&
                                Date.parse(rating.scheduledAt) === Date.parse(item.scheduledAt),
                            );
                            if (block.entries.length === 1 && !rating) return null;
                            return (
                              <div key={item.id} className={styles.historyRow}>
                                {block.entries.length > 1 ? (
                                  <button
                                    type="button"
                                    className={styles.rowButton}
                                    onClick={(event) =>
                                      onSelect(
                                        {
                                          ...block,
                                          id: item.id,
                                          start: Date.parse(item.scheduledAt),
                                          end:
                                            item.durationMinutes === null
                                              ? null
                                              : Date.parse(item.scheduledAt) +
                                                item.durationMinutes * 60000,
                                          entries: [item],
                                        },
                                        event.currentTarget,
                                      )
                                    }
                                  >
                                    <time dateTime={item.scheduledAt}>
                                      {formatTime(item.scheduledAt)}
                                      {item.durationMinutes !== null
                                        ? ` – ${formatTime(Date.parse(item.scheduledAt) + item.durationMinutes * 60000)}`
                                        : ""}
                                    </time>
                                    <HistoryBadge state={stateOf(item, now)} />
                                  </button>
                                ) : (
                                  <span className={styles.detailHint}>
                                    Encuesta de esta práctica
                                  </span>
                                )}
                                {rating ? (
                                  <Button variant="ghost" onClick={() => onRate(rating)}>
                                    Calificar
                                  </Button>
                                ) : null}
                              </div>
                            );
                          })}
                        </article>
                      ))}
                    </motion.section>
                  ))}
                </AnimatePresence>
              </section>
            ) : null;
          })}
          {upcoming.length + previous.length > limit ? (
            <Button variant="secondary" className={styles.more} onClick={onMore}>
              Mostrar más prácticas
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
