"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import {
  atNoon,
  dateKey,
  formatDate,
  formatTime,
  isUpcoming,
  plusDays,
  stateOf,
  type HistoryEntry,
} from "./historyModel";
import { HistoryBadge, HistoryIcon, Instructor } from "./HistoryVisual";
import styles from "./history.module.css";

export function HistoryRail({
  entries,
  now,
  selectedDay,
  complete,
  onDay,
}: {
  entries: HistoryEntry[];
  now: number | null;
  selectedDay: string | null;
  complete: boolean;
  onDay: (day: string) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const month =
    selectedMonth ??
    (now !== null
      ? dateKey(now).slice(0, 7)
      : entries[0]
        ? dateKey(entries[0].scheduledAt).slice(0, 7)
        : "2000-01");
  const first = `${month}-01`;
  const weekday = (new Date(atNoon(first)).getUTCDay() + 6) % 7;
  const start = plusDays(first, -weekday);
  const nextMonth = (direction: number) => {
    const [year, number] = month.split("-").map(Number);
    setSelectedMonth(dateKey(Date.UTC(year, number - 1 + direction, 1, 17)).slice(0, 7));
  };
  const days = Array.from({ length: 42 }, (_, index) => plusDays(start, index));
  const byDay = new Map<string, HistoryEntry[]>();
  for (const item of entries) {
    const key = dateKey(item.scheduledAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const next = [...entries]
    .filter((item) => isUpcoming(item, now))
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
  const minutes =
    next && now !== null
      ? Math.max(0, Math.ceil((Date.parse(next.scheduledAt) - now) / 60000))
      : null;
  return (
    <aside className={styles.rail} aria-label="Calendario y próxima práctica">
      <section className={styles.calendar} aria-label="Calendario de asistencia">
        <div className={styles.calendarHeader}>
          <h2>{formatDate(atNoon(first), { month: "long", year: "numeric" })}</h2>
          <div>
            <Button variant="ghost" aria-label="Mes anterior" onClick={() => nextMonth(-1)}>
              <ChevronLeftIcon className={styles.icon} />
            </Button>
            <Button variant="ghost" aria-label="Mes siguiente" onClick={() => nextMonth(1)}>
              <ChevronRightIcon className={styles.icon} />
            </Button>
          </div>
        </div>
        {!complete ? (
          <p className={styles.secondary}>Calendario de los registros disponibles.</p>
        ) : null}
        <div className={styles.calendarWeekdays} aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index}>
              {formatDate(atNoon(plusDays("2026-11-09", index)), { weekday: "short" })}
            </span>
          ))}
        </div>
        <div className={styles.calendarDays}>
          {days.map((day) => {
            const items = byDay.get(day) ?? [];
            const state = [...items]
              .map((item) => stateOf(item, now))
              .sort((a, b) => b.priority - a.priority)[0];
            return (
              <button
                key={day}
                type="button"
                data-state={state?.tone}
                data-outside={day.slice(0, 7) !== month || undefined}
                data-today={(now !== null && day === dateKey(now)) || undefined}
                aria-current={now !== null && day === dateKey(now) ? "date" : undefined}
                aria-pressed={selectedDay === day}
                disabled={!items.length}
                aria-label={`${formatDate(atNoon(day), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${items.length ? `: ${items.length} prácticas, ${[...new Set(items.map((item) => stateOf(item, now).label))].join(", ")}` : ": sin prácticas"}`}
                onClick={() => onDay(day)}
              >
                {formatDate(atNoon(day), { day: "numeric" })}
                {state ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className={styles.calendarNote}>
          Elige un día con práctica para verlo en tu línea de tiempo.
        </p>
      </section>
      <section className={styles.nextPractice}>
        <h2>Próxima práctica</h2>
        {next ? (
          <>
            <p className={styles.nextDate}>
              {formatDate(next.scheduledAt, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className={styles.nextTime}>
              {formatTime(next.scheduledAt)}
              {next.durationMinutes !== null
                ? ` – ${formatTime(Date.parse(next.scheduledAt) + next.durationMinutes * 60000)}`
                : ""}
            </p>
            {next.instructor ? <Instructor name={next.instructor.name} compact /> : null}
            <HistoryBadge state={stateOf(next, now)} />
            {minutes !== null ? (
              <p className={styles.countdown}>
                <HistoryIcon kind="clock" />
                {minutes === 0
                  ? "En curso"
                  : minutes >= 1440
                    ? `En ${Math.floor(minutes / 1440)} días`
                    : `En ${minutes >= 60 ? `${Math.floor(minutes / 60)} h ` : ""}${minutes % 60} min`}
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.secondary}>
            {complete
              ? "No tienes próximas prácticas en esta matrícula."
              : "Completando tu agenda…"}
          </p>
        )}
        <Link href="/student/schedule" className={styles.textLink}>
          Ir a Horarios de práctica
        </Link>
      </section>
      <details className={styles.rules}>
        <summary>Cómo se cuenta</summary>
        <ul>
          <li>Solo cuentan las horas asistidas.</li>
          <li>
            El instructor registra la asistencia y puede corregirla hasta 48 horas después del fin
            de la práctica.
          </li>
          <li>El administrador puede corregir con motivo y recibirás un aviso.</li>
          <li>Las horas perdidas son informativas y no reducen tu objetivo.</li>
        </ul>
      </details>
    </aside>
  );
}
