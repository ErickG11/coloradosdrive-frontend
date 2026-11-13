"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, EmptyState, Input } from "@/components/ui";
import { addDays, dayKey } from "@/lib/utils/calendar";
import { parseSchoolDateKey, schoolCalendarDate } from "@/lib/utils/schoolTime";
import { buildAgendaBlocks, formatDayLabel } from "../_lib/instructorAgenda";
import { AttendanceBlock } from "./_components/AttendanceBlock";
import { registrable, useAttendance } from "./useAttendance";

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
  const today = schoolCalendarDate(new Date());
  const initial = parseSchoolDateKey(fecha);
  const [from, setFrom] = useState(() => dayKey(initial ?? addDays(today, -6)));
  const [to, setTo] = useState(() => dayKey(initial ?? today));
  const [tab, setTab] = useState("Pendientes");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const applied = useRef(fecha);
  const status = useRef<HTMLParagraphElement>(null);
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  const valid = !!parseSchoolDateKey(from) && !!parseSchoolDateKey(to) && span >= 1 && span <= 60;
  const state = useAttendance(from, to, valid);
  useEffect(() => {
    if (applied.current !== fecha) {
      applied.current = fecha;
      const date = parseSchoolDateKey(fecha);
      if (date) {
        setFrom(dayKey(date));
        setTo(dayKey(date));
      }
    }
  }, [fecha]);
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
          ? b.identityPending || b.slots.some((s) => s.attended === null)
          : b.slots.some((s) => s.attended !== null)),
    );
  const dates = [...new Set(filtered.map((b) => b.date))].sort().reverse();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Asistencias</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Registro por hora, organizado por bloques · Hora de Ecuador
        </p>
      </header>
      <dl aria-label="Resumen del rango" className="grid gap-3 sm:grid-cols-3">
        {["Pendientes", "Asistidas", "Faltas"].map((label, i) => (
          <div key={label} className="rounded-md border border-border bg-bg-surface p-4">
            <dt className="text-sm text-text-secondary">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {counts[i]} <span className="text-xs font-normal">horas</span>
            </dd>
          </div>
        ))}
      </dl>
      <fieldset disabled={state.busy} className="grid min-w-0 gap-3 sm:grid-cols-3">
        <legend className="sr-only">Filtrar asistencias</legend>
        <Input
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="!min-h-11"
        />
        <Input
          label="Hasta"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="!min-h-11"
        />
        <Input
          label="Buscar alumno"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!min-h-11"
        />
      </fieldset>
      {!valid ? <p role="alert">Selecciona un rango válido de 1 a 60 días.</p> : null}
      <div role="group" aria-label="Estado de asistencia" className="flex flex-wrap gap-2">
        {["Pendientes", "Registradas", "Todas"].map((label) => (
          <Button
            key={label}
            variant={tab === label ? "primary" : "secondary"}
            className="!min-h-11"
            disabled={state.busy}
            aria-pressed={tab === label}
            onClick={() => setTab(label)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p role="status" tabIndex={-1} ref={status} className="text-sm text-text-secondary">
        {state.busy ? "Guardando por hora…" : state.message}
      </p>
      {valid && state.loading ? (
        <div role="status">
          Cargando asistencias…
          <div aria-hidden="true" className="mt-3 grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 rounded-md border border-border bg-bg-sunken" />
            ))}
          </div>
        </div>
      ) : null}
      {valid && state.error ? (
        <div role="alert">
          <p>{state.error}</p>
          <Button variant="secondary" className="mt-2 !min-h-11" onClick={() => void state.load()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {valid && state.blocksFailed ? (
        <p className="text-sm text-status-warning">
          No se pudieron agrupar los bloques. Se muestran las horas por separado.
        </p>
      ) : null}
      {valid && !state.loading && !state.error && !filtered.length ? (
        <EmptyState
          title="Todo al día"
          description="No hay asistencias que coincidan con estos filtros."
        />
      ) : null}
      {valid && !state.loading && !state.error
        ? dates.map((date) => (
            <section key={date} aria-label={date} className="min-w-0">
              <h2 className="mb-3 font-semibold">{formatDayLabel(parseSchoolDateKey(date)!)}</h2>
              <div className="grid gap-3">
                {filtered
                  .filter((b) => b.date === date)
                  .map((block) => (
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
          ))
        : null}
    </div>
  );
}
