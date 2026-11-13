"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { addWeeks, dayKey, formatWeekRangeLabel, getWeekDays } from "@/lib/utils/calendar";
import { schoolCalendarDate } from "@/lib/utils/schoolTime";
import { useInstructorPracticeSlots } from "./_hooks/useInstructorPracticeSlots";
import {
  attendanceHref,
  blockTime,
  buildAgendaBlocks,
  formatDayLabel,
  pendingAttendance,
} from "./_lib/instructorAgenda";
import { AgendaCalendar, AgendaDayNavigation } from "./_components/AgendaCalendar";
import { AgendaDayList } from "./_components/AgendaDayList";
import { AgendaBlockDetail } from "./_components/AgendaBlockDetail";
import { AgendaOverview } from "./_components/AgendaOverview";
import styles from "./_components/agenda.module.css";

const WIDE_QUERY = "(min-width: 768px)";
const getWide = () =>
  typeof window.matchMedia === "function" && window.matchMedia(WIDE_QUERY).matches;
const getServerWide = () => false;
function subscribeWidth(notify: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export default function InstructorPage() {
  return (
    <Suspense fallback={<p role="status">Cargando horario…</p>}>
      <InstructorAgenda />
    </Suspense>
  );
}

function InstructorAgenda() {
  const fecha = useSearchParams()?.get("fecha") ?? null;
  const {
    currentDate,
    data,
    definitions,
    blocksFailed,
    isLoading,
    error,
    requestWeek,
    selectDay,
    retry,
  } = useInstructorPracticeSlots(fecha);
  const wide = useSyncExternalStore(subscribeWidth, getWide, getServerWide);
  const [chosenView, setChosenView] = useState<"semana" | "dia" | null>(null);
  const view = chosenView ?? (wide ? "semana" : "dia");
  const [now, setNow] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const blocks = useMemo(() => buildAgendaBlocks(data ?? [], definitions), [data, definitions]);
  const days = getWeekDays(currentDate);
  const selectedKey = dayKey(currentDate);
  const todayKey = now === null ? "" : dayKey(schoolCalendarDate(new Date(now)));
  const selectedBlocks = blocks.filter((block) => block.date === selectedKey);
  const occupied = selectedBlocks.filter((block) => block.slots[0].studentId !== null);
  const pending = selectedBlocks.reduce(
    (total, block) => total + pendingAttendance(block, now ?? 0),
    0,
  );
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId);
  const schedule = occupied.length
    ? blockTime({
        ...occupied[0],
        endsAt: new Date(
          Math.max(...occupied.map((block) => Date.parse(block.endsAt))),
        ).toISOString(),
      })
    : "Sin bloques con alumno";
  function navigate(date: Date) {
    setSelectedBlockId(null);
    requestWeek(date);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Mi agenda</h1>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Vista de la agenda">
          <Button
            variant={view === "semana" ? "primary" : "ghost"}
            aria-pressed={view === "semana"}
            onClick={() => setChosenView("semana")}
          >
            Semana
          </Button>
          <Button
            variant={view === "dia" ? "primary" : "ghost"}
            aria-pressed={view === "dia"}
            onClick={() => setChosenView("dia")}
          >
            Día
          </Button>
        </div>
      </header>
      <AgendaOverview
        blocks={blocks}
        todayKey={todayKey}
        now={now}
        loaded={data !== null}
        weekContainsToday={days.some((day) => dayKey(day) === todayKey)}
        from={dayKey(days[0])}
        to={dayKey(days[6])}
        onSelect={(block) => setSelectedBlockId(block.id)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p aria-live="polite" className="font-medium text-text-primary">
            {formatWeekRangeLabel(currentDate)}
          </p>
          <p className="text-xs text-text-secondary">Hora de Ecuador (America/Guayaquil)</p>
        </div>
        <nav aria-label="Navegación semanal" className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="!min-h-11"
            onClick={() => navigate(addWeeks(currentDate, -1))}
          >
            Semana anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="!min-h-11"
            onClick={() => navigate(schoolCalendarDate(new Date()))}
          >
            Hoy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="!min-h-11"
            onClick={() => navigate(addWeeks(currentDate, 1))}
          >
            Semana siguiente
          </Button>
        </nav>
      </div>
      <section aria-labelledby="selected-day" className="min-w-0">
        <h2 id="selected-day" className="mb-3 text-base font-semibold text-text-primary">
          {formatDayLabel(currentDate)}
        </h2>
        <dl aria-label="Resumen del día" className={styles.summary}>
          <div>
            <dt>Bloques con alumno</dt>
            <dd>{data ? occupied.length : "—"}</dd>
          </div>
          <div>
            <dt>Horario del día</dt>
            <dd>{data ? schedule : "—"}</dd>
          </div>
          <div>
            <dt>Asistencias pendientes</dt>
            <dd>
              <Link
                href={attendanceHref(selectedKey)}
                aria-label={`${pending} asistencias pendientes de registrar`}
              >
                {pending} {pending === 1 ? "hora" : "horas"}
                <span aria-hidden="true">↗</span>
              </Link>
            </dd>
          </div>
        </dl>
      </section>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-error bg-status-error-bg p-4 text-sm text-status-error"
        >
          <p>{error}</p>
          <Button variant="secondary" className="!min-h-11" onClick={retry}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <div role="status" className="text-sm text-text-secondary">
          Cargando horario…
          {data === null ? (
            <div aria-hidden="true" className="mt-3 grid gap-3">
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          ) : null}
        </div>
      ) : null}
      {data && blocksFailed ? (
        <p className="rounded-sm bg-status-warning-bg px-4 py-3 text-sm text-status-warning">
          No se pudieron agrupar las horas en bloques. Se muestran las franjas por separado.
        </p>
      ) : null}
      {data ? (
        <section
          aria-label={view === "semana" ? "Agenda semanal" : "Agenda del día"}
          aria-busy={isLoading}
          className="min-w-0"
        >
          {view === "semana" ? (
            <AgendaCalendar
              days={days}
              selectedKey={selectedKey}
              todayKey={todayKey}
              blocks={blocks}
              now={now ?? 0}
              onSelectDay={selectDay}
              onSelectBlock={(block) => setSelectedBlockId(block.id)}
            />
          ) : (
            <>
              <div className="mb-4">
                <AgendaDayNavigation
                  days={days}
                  selectedKey={selectedKey}
                  todayKey={todayKey}
                  blocks={blocks}
                  onSelect={selectDay}
                />
                <p className="mt-2 text-xs text-text-secondary">Bloques con alumno por día</p>
              </div>
              <AgendaDayList
                blocks={selectedBlocks}
                now={now ?? 0}
                onSelect={(block) => setSelectedBlockId(block.id)}
              />
            </>
          )}
        </section>
      ) : null}
      {selectedBlock ? (
        <AgendaBlockDetail
          block={selectedBlock}
          now={now ?? 0}
          wide={wide}
          onClose={() => setSelectedBlockId(null)}
        />
      ) : null}
    </div>
  );
}
