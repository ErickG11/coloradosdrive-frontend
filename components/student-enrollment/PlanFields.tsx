"use client";
import { useId, useState } from "react";
import type {
  StudentPlanRules,
  StudentScheduleSelection,
  StudentScheduleStartOption,
} from "@/types/studentSchedule";
import { dayLabel } from "./scheduleFormat";
import { SegmentedControl } from "./SegmentedControl";

export interface PlanCalendarDay {
  fecha: string;
  disponible: boolean;
  motivo?: string | null;
  planDays?: { fecha: string; horas: number }[];
  horas?: StudentScheduleStartOption[];
}
export function monthTitle(month: string): string {
  const text = new Intl.DateTimeFormat("es-EC", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
export const timeRange = (hour: string, hours: number) =>
  `${hour} – ${String(Number(hour.slice(0, 2)) + hours).padStart(2, "0")}:00`;
export function PlanFields({
  rules,
  value,
  onChange,
  month,
  onMonth,
  minDate,
  maxDate,
  days,
  hours = [],
  disabled = false,
  loading = false,
}: {
  rules: StudentPlanRules | undefined;
  value: StudentScheduleSelection;
  onChange: (value: StudentScheduleSelection) => void;
  month: string;
  onMonth: (month: string) => void;
  minDate: string;
  maxDate?: string;
  days: PlanCalendarDay[];
  hours?: StudentScheduleStartOption[];
  disabled?: boolean;
  loading?: boolean;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const options = (rules?.options ?? []).filter(
    (o) => o.habilitada && o.modalidad === value.modalidad,
  );
  const selectedPlan = days.find((d) => d.fecha === value.fechaInicio)?.planDays;
  // Al navegar de mes se conserva el plan recibido del servidor para seguir pintándolo.
  const [saved, setSaved] = useState<{
    key: string;
    days: { fecha: string; horas: number }[];
  } | null>(null);
  const selectionKey = `${value.modalidad}|${value.horasPorDia}|${value.fechaInicio}`;
  if (selectedPlan && saved?.key !== selectionKey)
    setSaved({ key: selectionKey, days: selectedPlan });
  const plan = selectedPlan ?? (saved?.key === selectionKey ? saved.days : []) ?? [];
  const hoverPlan = days.find((d) => d.fecha === hovered && d.disponible)?.planDays ?? [];
  const paint = hoverPlan.length ? hoverPlan : plan;
  const previewing = hoverPlan.length > 0;
  const painted = new Set(paint.map((d) => d.fecha));
  const [year, number] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, number, 0)).getUTCDate();
  function changeMode(modalidad: StudentScheduleSelection["modalidad"]) {
    const next = (rules?.options ?? []).filter((o) => o.habilitada && o.modalidad === modalidad);
    onChange({
      modalidad,
      horasPorDia: modalidad === "fin_de_semana" && next.length === 1 ? next[0].horasPorDia : 0,
      fechaInicio: "",
      horaInicio: -1,
    });
  }
  return (
    <div className="grid min-w-0 gap-6">
      <SegmentedControl
        legend="Modalidad"
        value={value.modalidad}
        disabled={disabled}
        options={[
          { value: "entre_semana", label: "Entre semana" },
          { value: "fin_de_semana", label: "Fin de semana" },
        ]}
        onChange={changeMode}
      />
      <fieldset className="min-w-0" disabled={disabled}>
        <legend className="mb-2 font-medium">Horas por día</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const n = o.sesiones;
            const fixed = value.modalidad === "fin_de_semana" && options.length === 1;
            const detail =
              value.modalidad === "entre_semana"
                ? `${n} días de práctica · ${Math.ceil(n / 5) === 1 ? "1 semana" : `unas ${Math.ceil(n / 5)} semanas`}`
                : `${n} días de práctica repartidos en ${Math.ceil(n / 2)} fines de semana`;
            const label = `${o.horasPorDia} ${o.horasPorDia === 1 ? "hora" : "horas"} por día${fixed ? " (obligatorias en fin de semana)" : ""} · ${detail}`;
            return fixed ? (
              <div
                key={o.horasPorDia}
                className="rounded-sm border border-brand-primary bg-bg-sunken p-4 sm:col-span-2"
              >
                {label}
              </div>
            ) : (
              <button
                key={o.horasPorDia}
                type="button"
                aria-pressed={value.horasPorDia === o.horasPorDia}
                onClick={() =>
                  onChange({
                    ...value,
                    horasPorDia: o.horasPorDia,
                    horaInicio:
                      value.horaInicio >= 0 &&
                      value.horaInicio + o.horasPorDia <= (rules?.endHour ?? 22)
                        ? value.horaInicio
                        : -1,
                  })
                }
                className="min-h-20 rounded-sm border border-border-strong p-4 text-left aria-pressed:border-brand-primary aria-pressed:bg-bg-sunken focus-visible:outline-2"
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="min-w-0" aria-busy={loading}>
        <legend className="mb-2 font-medium">Fecha de inicio</legend>
        <div className="max-w-lg" role="group" aria-label="Fechas de inicio disponibles">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={disabled || month <= minDate.slice(0, 7)}
              onClick={() => onMonth(shiftMonth(month, -1))}
              className="min-h-11 min-w-11 rounded-sm border disabled:opacity-40"
            >
              ‹
            </button>
            <strong aria-live="polite">{monthTitle(month)}</strong>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={disabled || Boolean(maxDate && month >= maxDate.slice(0, 7))}
              onClick={() => onMonth(shiftMonth(month, 1))}
              className="min-h-11 min-w-11 rounded-sm border disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" aria-hidden="true">
            {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div
            className="mt-2 grid grid-cols-7 gap-1"
            onMouseLeave={() => setHovered(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null);
            }}
          >
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: total }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const day = days.find((d) => d.fecha === date);
              const ok =
                Boolean(day?.disponible) &&
                Boolean(value.horasPorDia) &&
                date >= minDate &&
                !disabled;
              const tip = `${id}-${date}`;
              const reason =
                date < minDate
                  ? "Esta fecha ya pasó."
                  : !value.horasPorDia
                    ? "Selecciona las horas por día."
                    : (day?.motivo ??
                      "No hay disponibilidad para el plan completo en esta fecha y modalidad.");
              const start = date === paint[0]?.fecha,
                end = date === paint.at(-1)?.fecha;
              return (
                <div key={date} className="group relative min-w-0">
                  <button
                    type="button"
                    aria-label={dayLabel(date)}
                    aria-disabled={!ok}
                    aria-pressed={value.fechaInicio === date}
                    aria-describedby={!ok ? tip : undefined}
                    data-plan-day={
                      painted.has(date) ? (previewing ? "preview" : "selected") : undefined
                    }
                    onMouseEnter={() => setHovered(ok ? date : null)}
                    onFocus={() => setHovered(ok ? date : null)}
                    onClick={() => {
                      if (ok) onChange({ ...value, fechaInicio: date, horaInicio: -1 });
                    }}
                    className={`flex min-h-12 w-full flex-col items-center justify-center rounded-sm border text-sm ${painted.has(date) ? (start && !previewing ? "border-brand-primary bg-brand-primary text-white" : previewing ? "border-brand-primary bg-bg-sunken" : "border-brand-primary bg-brand-primary/15") : ok ? "border-border-strong" : "border-border opacity-40"}`}
                  >
                    {i + 1}
                    {painted.has(date) && (start || end) ? (
                      <span className="text-[9px] leading-tight">{start ? "Inicio" : "Fin"}</span>
                    ) : null}
                  </button>
                  {!ok ? (
                    <span
                      id={tip}
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-40 -translate-x-1/2 rounded-sm border bg-bg-surface p-2 text-xs shadow-elevated group-hover:block group-focus-within:block"
                    >
                      {reason}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {paint.at(-1)?.fecha.slice(0, 7) !== month &&
          paint.some((d) => d.fecha.slice(0, 7) > month) ? (
            <p className="mt-2 text-sm" aria-live="polite">
              Tu plan continúa en {monthTitle(paint.at(-1)!.fecha.slice(0, 7)).toLowerCase()}.
            </p>
          ) : null}
          {loading ? (
            <p role="status" className="mt-2">
              Consultando fechas…
            </p>
          ) : null}
        </div>
      </fieldset>
      <fieldset className="min-w-0" disabled={disabled}>
        <legend className="mb-2 font-medium">Horario</legend>
        <p className="mb-3 text-sm text-text-secondary" aria-live="polite">
          {value.horaInicio < 0
            ? "Seleccione un horario"
            : timeRange(`${String(value.horaInicio).padStart(2, "0")}:00`, value.horasPorDia)}
        </p>
        {[
          { name: "Mañana", from: 6, to: 12 },
          { name: "Tarde", from: 12, to: 18 },
          { name: "Noche", from: 18, to: 24 },
        ].map((group) => {
          const list = hours.filter(
            (h) =>
              Number(h.hora.slice(0, 2)) >= group.from &&
              Number(h.hora.slice(0, 2)) < group.to &&
              Number(h.hora.slice(0, 2)) + value.horasPorDia <= (rules?.endHour ?? 22),
          );
          return list.length ? (
            <div key={group.name} className="mb-3">
              <p className="mb-2 text-sm font-medium">{group.name}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((h) => (
                  <div key={h.hora} className="group relative">
                    <button
                      type="button"
                      aria-disabled={!h.factible}
                      aria-pressed={value.horaInicio === Number(h.hora.slice(0, 2))}
                      aria-describedby={!h.factible ? `${id}-h-${h.hora}` : undefined}
                      onClick={() => {
                        if (h.factible)
                          onChange({ ...value, horaInicio: Number(h.hora.slice(0, 2)) });
                      }}
                      className={`min-h-12 w-full rounded-sm border px-2 text-sm aria-pressed:border-brand-primary aria-pressed:bg-bg-sunken ${!h.factible ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      {timeRange(h.hora, value.horasPorDia)}
                    </button>
                    {!h.factible ? (
                      <span
                        id={`${id}-h-${h.hora}`}
                        role="tooltip"
                        className="pointer-events-none absolute top-full z-20 hidden w-44 rounded-sm border bg-bg-surface p-2 text-xs group-hover:block group-focus-within:block"
                      >
                        {h.motivo?.mensaje ?? "No hay disponibilidad."}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })}
        <p className="text-sm text-text-secondary">
          La hora de inicio es la misma todos los días del plan.
        </p>
      </fieldset>
    </div>
  );
}
