"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, EmptyState, Input } from "@/components/ui";
import { addDays, dayKey } from "@/lib/utils/calendar";
import { parseSchoolDateKey, schoolCalendarDate } from "@/lib/utils/schoolTime";
import { buildAgendaBlocks, formatDayLabel, type AgendaBlock } from "../_lib/instructorAgenda";
import { InstructorIcon } from "../_components/InstructorVisuals";
import { AttendanceBlock } from "./_components/AttendanceBlock";
import { registrable, useAttendance } from "./useAttendance";
import styles from "./attendance.module.css";

export default function AttendancePage() {
  return (
    <Suspense fallback={<p role="status">Cargando asistencias…</p>}>
      <AttendanceWorkspace />
    </Suspense>
  );
}
function AttendanceWorkspace() {
  const params = useSearchParams();
  const fecha = params?.get("fecha") ?? null;
  const linkedFrom = params?.get("desde") ?? null;
  const linkedTo = params?.get("hasta") ?? null;
  const rangeKey = `${fecha}|${linkedFrom}|${linkedTo}`;
  const today = schoolCalendarDate(new Date());
  const initial = parseSchoolDateKey(fecha);
  const [from, setFrom] = useState(() =>
    dayKey(parseSchoolDateKey(linkedFrom) ?? initial ?? addDays(today, -6)),
  );
  const [to, setTo] = useState(() => dayKey(parseSchoolDateKey(linkedTo) ?? initial ?? today));
  const [tab, setTab] = useState("Pendientes");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const applied = useRef(rangeKey);
  const status = useRef<HTMLParagraphElement>(null);
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  const valid = !!parseSchoolDateKey(from) && !!parseSchoolDateKey(to) && span >= 1 && span <= 60;
  const state = useAttendance(from, to, valid);
  useEffect(() => {
    if (applied.current === rangeKey) return;
    applied.current = rangeKey;
    const start = parseSchoolDateKey(linkedFrom) ?? parseSchoolDateKey(fecha);
    const end = parseSchoolDateKey(linkedTo) ?? parseSchoolDateKey(fecha);
    if (start && end) {
      setFrom(dayKey(start));
      setTo(dayKey(end));
    }
  }, [rangeKey, linkedFrom, linkedTo, fecha]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    if (state.message) status.current?.focus();
  }, [state.message]);
  const blocks = useMemo(
    () =>
      buildAgendaBlocks(
        state.slots.filter((s) => s.studentId !== null),
        state.definitions,
      ),
    [state.slots, state.definitions],
  );
  const totals = state.slots.filter((s) => registrable(s, now));
  const counts = [
    totals.filter((s) => s.attended === null).length,
    totals.filter((s) => s.attended === true).length,
    totals.filter((s) => s.attended === false).length,
  ];
  const total = totals.length;
  const tabCounts = [
    counts[0],
    counts[1] + counts[2],
    state.slots.filter((s) => s.studentId !== null).length,
  ];
  const hasData = valid && !state.loading && !state.error;
  const priority = (b: AgendaBlock) =>
    b.slots.some((s) => state.failures[s.id] || (registrable(s, now) && s.attended === null))
      ? 0
      : 1;
  const filtered = blocks
    .filter(
      (b) =>
        b.slots[0].studentName
          ?.toLocaleLowerCase("es")
          .includes(search.trim().toLocaleLowerCase("es")) ?? !search.trim(),
    )
    .filter(
      (b) =>
        state.busy ||
        b.slots.some((s) => state.failures[s.id]) ||
        tab === "Todas" ||
        (tab === "Pendientes"
          ? b.slots.some((s) => registrable(s, now) && s.attended === null)
          : b.slots.some((s) => s.attended !== null)),
    )
    .sort((a, b) => priority(a) - priority(b) || Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const dates = [...new Set(filtered.map((b) => b.date))].sort(
    (a, b) =>
      Math.min(...filtered.filter((x) => x.date === a).map(priority)) -
        Math.min(...filtered.filter((x) => x.date === b).map(priority)) || b.localeCompare(a),
  );
  function shortcut(days: number) {
    const date = schoolCalendarDate(new Date());
    setFrom(dayKey(addDays(date, 1 - days)));
    setTo(dayKey(date));
  }
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <h1>Asistencias</h1>
          <p>Tu registro de prácticas, hora por hora.</p>
        </div>
        <span className={styles.timezone}>
          <InstructorIcon name="clock" />
          America/Guayaquil
        </span>
      </header>
      <dl aria-label="Resumen del rango" className={styles.metrics} aria-busy={state.loading}>
        {["Pendientes", "Asistidas", "Faltas"].map((label, i) => (
          <div
            key={label}
            className={`${styles.metric} ${[styles.pending, styles.assisted, styles.missed][i]}`}
          >
            <dt>
              <InstructorIcon name={i === 0 ? "clock" : i === 1 ? "check" : "alert"} />
              {label}
            </dt>
            <dd>
              {hasData ? counts[i] : "—"}
              <span>horas</span>
            </dd>
            <div
              role="progressbar"
              aria-label={`Proporción de ${label.toLocaleLowerCase("es")}`}
              aria-valuenow={hasData ? counts[i] : 0}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, total)}
              aria-valuetext={
                hasData ? `${counts[i]} de ${total} horas terminadas` : "Sin datos disponibles"
              }
              className={styles.progress}
            >
              <span
                style={{
                  width: `${hasData && total ? (counts[i] / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
      <div className={styles.filterBar}>
        <div role="group" aria-label="Estado de asistencia" className={styles.tabs}>
          {["Pendientes", "Registradas", "Todas"].map((label, i) => (
            <Button
              key={label}
              variant="ghost"
              className="!min-h-11"
              aria-label={label}
              aria-describedby={`attendance-tab-count-${i}`}
              disabled={state.busy}
              aria-pressed={tab === label}
              onClick={() => setTab(label)}
            >
              {label}
              <span aria-hidden="true">{hasData ? tabCounts[i] : "—"}</span>
              <span id={`attendance-tab-count-${i}`} className="sr-only">
                {hasData ? `${tabCounts[i]} horas` : "Sin datos disponibles"}
              </span>
            </Button>
          ))}
        </div>
        <fieldset disabled={state.busy} className={styles.dateFields}>
          <legend className="sr-only">Rango de fechas</legend>
          <Input
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="!min-h-11"
          />
          <span aria-hidden="true">–</span>
          <Input
            label="Hasta"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="!min-h-11"
          />
        </fieldset>
        <div role="group" aria-label="Atajos de fechas" className={styles.shortcuts}>
          {[
            [1, "Hoy"],
            [7, "7 días"],
            [30, "30 días"],
          ].map(([days, label]) => (
            <Button
              key={days}
              variant="ghost"
              className="!min-h-11"
              disabled={state.busy}
              onClick={() => shortcut(Number(days))}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className={styles.search}>
          <InstructorIcon name="search" />
          <Input
            label="Buscar alumno"
            type="search"
            placeholder="Buscar alumno…"
            disabled={state.busy}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!min-h-11"
          />
        </div>
      </div>
      {!valid ? (
        <p role="alert" className={styles.rangeError}>
          Selecciona un rango válido de 1 a 60 días.
        </p>
      ) : null}
      <p
        role="status"
        tabIndex={-1}
        ref={status}
        className={styles.result}
        data-visible={state.busy || !!state.message}
        data-tone={
          state.busy
            ? "saving"
            : state.outcome?.failed
              ? state.outcome.saved
                ? "warning"
                : "error"
              : "success"
        }
      >
        {state.busy ? "Guardando por hora…" : state.message}
      </p>
      {valid && state.loading ? (
        <div role="status" className={styles.loading}>
          Cargando asistencias…
          <div aria-hidden="true" className={styles.skeletons}>
            {[0, 1].map((i) => (
              <div key={i}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {valid && state.error ? (
        <div role="alert" className={styles.error}>
          <InstructorIcon name="alert" />
          <p>{state.error}</p>
          <Button variant="secondary" className="!min-h-11" onClick={() => void state.load()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {valid && state.blocksFailed ? (
        <p className={styles.fallback}>
          No se pudieron agrupar los bloques. Se muestran las horas por separado.
        </p>
      ) : null}
      {valid && !state.loading && !state.error && !filtered.length ? (
        <EmptyState
          title="Todo al día"
          description="No hay horas pendientes con estos filtros. Puedes revisar las registradas o consultar otro rango."
        />
      ) : null}
      {valid && !state.loading && !state.error
        ? dates.map((date) => {
            const dayBlocks = filtered.filter((b) => b.date === date);
            return (
              <section key={date} aria-label={date} className={styles.day}>
                <header className={styles.dayHeader}>
                  <h2>{formatDayLabel(parseSchoolDateKey(date)!)}</h2>
                  <span>
                    {dayBlocks.length} {dayBlocks.length === 1 ? "bloque" : "bloques"} ·{" "}
                    {dayBlocks.reduce((n, b) => n + b.minutes / 60, 0)} h
                  </span>
                </header>
                <div className={styles.blockList}>
                  {dayBlocks.map((block) => (
                    <AttendanceBlock
                      key={block.id}
                      block={block}
                      now={now}
                      busy={state.busy}
                      failures={state.failures}
                      run={state.run}
                    />
                  ))}
                </div>
              </section>
            );
          })
        : null}
    </div>
  );
}
