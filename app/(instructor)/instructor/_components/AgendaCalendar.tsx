"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui";
import { dayKey } from "@/lib/utils/calendar";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
import {
  FIRST_HOUR,
  LAST_HOUR,
  HOUR_HEIGHT,
  fitsCalendar,
  formatDayLabel,
  layoutDay,
  schoolMinutes,
  type AgendaBlock,
} from "../_lib/instructorAgenda";
import { AgendaBlockCard } from "./AgendaDayList";
import styles from "./agenda.module.css";

export function AgendaDayNavigation({
  days,
  selectedKey,
  todayKey,
  blocks,
  onSelect,
}: {
  days: Date[];
  selectedKey: string;
  todayKey: string;
  blocks: AgendaBlock[];
  onSelect: (day: Date) => void;
}) {
  return (
    <nav aria-label="Días de la semana" className={styles.dayNavigation}>
      {days.map((day, index) => {
        const key = dayKey(day);
        const count = blocks.filter(
          (block) => block.date === key && block.slots[0].studentId !== null,
        ).length;
        return (
          <Button
            key={key}
            variant={selectedKey === key ? "primary" : "ghost"}
            className={styles.dayButton}
            aria-label={`${formatDayLabel(day)}, ${count} bloques con alumno${key === todayKey ? ", hoy" : ""}`}
            aria-pressed={selectedKey === key}
            aria-current={key === todayKey ? "date" : undefined}
            onClick={() => onSelect(day)}
          >
            <span aria-hidden="true">{["L", "M", "X", "J", "V", "S", "D"][index]}</span>
            <span aria-hidden="true" className={styles.dayNumber}>
              {day.getDate()}
            </span>
            <span aria-hidden="true" className={styles.dayCount}>
              {key === todayKey ? "Hoy · " : ""}
              {count}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}

export function AgendaCalendar({
  days,
  selectedKey,
  todayKey,
  blocks,
  now,
  onSelectDay,
  onSelectBlock,
}: {
  days: Date[];
  selectedKey: string;
  todayKey: string;
  blocks: AgendaBlock[];
  now: number;
  onSelectDay: (day: Date) => void;
  onSelectBlock: (block: AgendaBlock) => void;
}) {
  const minutes = (LAST_HOUR - FIRST_HOUR) * 60;
  const nowMinute = schoolMinutes(new Date(now).toISOString());
  const outside = blocks.filter((block) => !fitsCalendar(block));
  return (
    <>
      <div
        className={styles.calendarViewport}
        tabIndex={0}
        role="region"
        aria-label="Calendario semanal de 06:00 a 22:00"
      >
        <div
          className={styles.calendar}
          style={{ "--hour-height": `${HOUR_HEIGHT}px` } as CSSProperties}
        >
          <div className={styles.calendarHeader}>
            <span className={styles.axisHeading}>Hora</span>
            <AgendaDayNavigation
              days={days}
              selectedKey={selectedKey}
              todayKey={todayKey}
              blocks={blocks}
              onSelect={onSelectDay}
            />
          </div>
          <div className={styles.weekBody}>
            <div className={styles.hourAxis} aria-hidden="true">
              {Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => (
                <span key={i} style={{ top: i * HOUR_HEIGHT }}>
                  {String(i + FIRST_HOUR).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const placements = layoutDay(
                blocks.filter((block) => block.date === key && fitsCalendar(block)),
              );
              return (
                <section
                  key={key}
                  aria-label={formatDayLabel(day)}
                  className={`${styles.calendarDay} ${key === todayKey ? styles.todayColumn : ""}`}
                >
                  {placements.map(({ block, lane, lanes }) => (
                    <div
                      key={block.id}
                      className={styles.calendarEvent}
                      data-duration-minutes={block.minutes}
                      style={{
                        top: `${((schoolMinutes(block.startsAt) - FIRST_HOUR * 60) / minutes) * 100}%`,
                        height: `calc(${(block.minutes / minutes) * 100}% - 8px)`,
                        left: `calc(${(lane / lanes) * 100}% + 4px)`,
                        width: `calc(${100 / lanes}% - 8px)`,
                      }}
                    >
                      <AgendaBlockCard block={block} now={now} onSelect={onSelectBlock} compact />
                    </div>
                  ))}
                  {key === todayKey &&
                  nowMinute >= FIRST_HOUR * 60 &&
                  nowMinute < LAST_HOUR * 60 ? (
                    <div
                      role="img"
                      aria-label={`Ahora, ${formatSchoolTime(new Date(now).toISOString())}`}
                      className={styles.nowLine}
                      style={{ top: `${((nowMinute - FIRST_HOUR * 60) / minutes) * 100}%` }}
                    >
                      <span>Ahora · {formatSchoolTime(new Date(now).toISOString())}</span>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
      {outside.length ? (
        <section
          aria-label="Bloques fuera del horario del calendario"
          className={styles.outsideHours}
        >
          <h3 className="font-semibold">Fuera de 06:00–22:00</h3>
          <p className="mb-3 text-sm text-text-secondary">
            Estos bloques también forman parte de tu agenda.
          </p>
          {outside.map((block) => (
            <div key={block.id} className="mb-3">
              <p className="mb-1 text-sm text-text-secondary">{block.date}</p>
              <AgendaBlockCard block={block} now={now} onSelect={onSelectBlock} />
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
