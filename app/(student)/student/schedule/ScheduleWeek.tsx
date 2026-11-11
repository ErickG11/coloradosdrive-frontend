"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import {
  addDays,
  dateLabel,
  dayInstant,
  dayKey,
  instructorName,
  timeLabel,
  visualState,
  type PracticeBlock,
} from "./scheduleModel";
import styles from "./schedule.module.css";
import { PracticeBadge } from "./ScheduleVisual";

function monday(key: string): string {
  const weekday = new Date(dayInstant(key)).getUTCDay();
  return addDays(key, -((weekday + 6) % 7));
}
const minuteOfDay = (instant: number) => {
  const [hour, minute] = timeLabel(instant).split(":").map(Number);
  return hour * 60 + minute;
};
export function ScheduleWeek({
  blocks,
  now,
  onSelect,
  focusedDay,
}: {
  blocks: PracticeBlock[];
  now: number | null;
  onSelect: (block: PracticeBlock, trigger: HTMLButtonElement) => void;
  focusedDay: string | null;
}) {
  const [chosenWeek, setChosenWeek] = useState<string | null>(() =>
    focusedDay ? monday(focusedDay) : null,
  );
  const [fullDay, setFullDay] = useState(false);
  const week = chosenWeek ?? monday(now !== null ? dayKey(now) : (blocks[0]?.day ?? "2000-01-03"));
  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const weekBlocks = blocks.filter((block) => days.includes(block.day));
  const firstHour = weekBlocks.length
    ? Math.min(...weekBlocks.map((block) => Math.floor(minuteOfDay(block.start) / 60)))
    : 7;
  const lastHour = weekBlocks.length
    ? Math.max(
        ...weekBlocks.map((block) =>
          block.day !== dayKey(block.end) ? 24 : Math.ceil(minuteOfDay(block.end) / 60),
        ),
      )
    : 11;
  const compactStart = Math.max(0, Math.min(firstHour - 1, 18));
  const compactEnd = Math.min(24, Math.max(lastHour + 1, compactStart + 6));
  const startHour = fullDay ? 0 : Math.max(0, Math.min(compactStart, compactEnd - 6));
  const endHour = fullDay ? 24 : compactEnd;
  const nowMinutes = now === null ? null : minuteOfDay(now);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  return (
    <section id="practice-week" tabIndex={-1} aria-label="Agenda semanal" className={styles.week}>
      <div className={styles.weekToolbar}>
        <p>
          {dateLabel(dayInstant(week), { day: "numeric", month: "short", year: "numeric" })} –{" "}
          {dateLabel(dayInstant(days[6]), { day: "numeric", month: "short" })}
        </p>
        <div className={styles.controls}>
          <Button
            variant="secondary"
            aria-label="Semana anterior"
            onClick={() => setChosenWeek(addDays(week, -7))}
          >
            <ChevronLeftIcon className={styles.icon} />
          </Button>
          <Button
            variant="secondary"
            disabled={now === null}
            onClick={() => now !== null && setChosenWeek(monday(dayKey(now)))}
          >
            Hoy
          </Button>
          <Button
            variant="secondary"
            aria-label="Semana siguiente"
            onClick={() => setChosenWeek(addDays(week, 7))}
          >
            <ChevronRightIcon className={styles.icon} />
          </Button>
        </div>
        <Button
          variant="ghost"
          aria-pressed={fullDay}
          onClick={() => setFullDay((value) => !value)}
        >
          {fullDay ? "Ver menos" : "Ver todo el día"}
        </Button>
      </div>
      <p className={styles.weekHelp}>
        Selecciona una práctica para ver sus opciones. Desliza para recorrer los días.
      </p>
      <div
        className={styles.weekScroll}
        tabIndex={0}
        role="region"
        aria-label="Calendario de lunes a domingo; desplazamiento horizontal"
      >
        <div className={styles.weekGrid}>
          <div className={styles.timeColumn}>
            <div className={styles.weekDayHeader}>UTC−5</div>
            <div className={styles.timeScale} style={{ height: (endHour - startHour) * 64 }}>
              {hours.map((hour) => (
                <span key={hour} style={{ top: (hour - startHour) * 64 }}>
                  {timeLabel(Date.parse(`2000-01-03T00:00:00-05:00`) + hour * 3600000)}
                </span>
              ))}
            </div>
          </div>
          {days.map((day) => (
            <div
              key={day}
              id={`practice-week-day-${day}`}
              className={styles.weekDay}
              data-today={(now !== null && day === dayKey(now)) || undefined}
            >
              <div className={styles.weekDayHeader}>
                {dateLabel(dayInstant(day), { weekday: "short" })}
                <strong>{dateLabel(dayInstant(day), { day: "numeric" })}</strong>
                {now !== null && day === dayKey(now) ? (
                  <span className={styles.todayPill}>Hoy</span>
                ) : null}
              </div>
              <div className={styles.dayScale} style={{ height: (endHour - startHour) * 64 }}>
                {hours.slice(0, -1).map((hour) => (
                  <div
                    key={hour}
                    className={styles.hourLine}
                    style={{ top: (hour - startHour) * 64 }}
                  />
                ))}
                {now !== null &&
                day === dayKey(now) &&
                nowMinutes !== null &&
                nowMinutes >= startHour * 60 &&
                nowMinutes < endHour * 60 ? (
                  <div
                    className={styles.nowLine}
                    style={{ top: (nowMinutes / 60 - startHour) * 64 }}
                    role="img"
                    aria-label={`Ahora, ${timeLabel(now)}`}
                  >
                    <span />
                  </div>
                ) : null}
                {weekBlocks
                  .filter((block) => block.day === day)
                  .map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      className={styles.weekEvent}
                      data-tone={visualState(block.slots[0], now).tone}
                      style={{
                        top: ((minuteOfDay(block.start) - startHour * 60) / 60) * 64,
                        height: Math.max(44, ((block.end - block.start) / 3600000) * 64 - 3),
                      }}
                      onClick={(event) => onSelect(block, event.currentTarget)}
                    >
                      <strong>
                        {timeLabel(block.start)} – {timeLabel(block.end)}
                      </strong>
                      <span className={styles.weekInstructor}>
                        {instructorName(block.slots[0])}
                      </span>
                      <span className={styles.weekSlotStates}>
                        {block.slots.map((slot) => (
                          <PracticeBadge key={slot.id} state={visualState(slot, now)} />
                        ))}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {weekBlocks.length === 0 ? (
        <p className={styles.weekHelp}>
          No tienes prácticas esta semana. Puedes consultar las semanas siguientes.
        </p>
      ) : null}
    </section>
  );
}
