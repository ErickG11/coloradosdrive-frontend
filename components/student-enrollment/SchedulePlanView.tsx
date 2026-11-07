import visual from "@/components/inscripcion/enrollment-surface.module.css";
import { dayLabel, dayLabelLong, plural } from "./scheduleFormat";

export interface PlanDayView {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  horas: number;
  /** false = falta disponibilidad: se marca distinto y bloquea reservar. */
  ok: boolean;
  motivo?: string | null;
}
// Solo lectura: ninguna casilla es interactiva. Escritorio: cuadrícula día×hora con
// únicamente los días del plan. Móvil: una tarjeta por día.
export function SchedulePlanView({ days }: { days: PlanDayView[] }) {
  if (!days.length) return null;
  const maxHours = Math.max(...days.map((d) => d.horas));
  const startHour = Number(days[0].horaInicio.slice(0, 2));
  const rows = Array.from({ length: maxHours }, (_, i) => startHour + i);
  return (
    <div className={visual.plan}>
      <div
        className="mt-4 hidden overflow-x-auto rounded-sm border border-border md:block"
        tabIndex={0}
        role="region"
        aria-label="Calendario de tu horario"
      >
        <table className="w-full border-collapse text-center text-sm">
          <caption className="sr-only">Días y horas de tu plan; solo lectura</caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-text-secondary">
                Hora
              </th>
              {days.map((day) => (
                <th scope="col" key={day.fecha} className="min-w-24 p-2 font-medium">
                  {dayLabel(day.fecha)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((hour) => (
              <tr key={hour}>
                <th scope="row" className="p-2 font-normal text-text-secondary">
                  {String(hour).padStart(2, "0")}:00
                </th>
                {days.map((day) => {
                  const filled = hour < startHour + day.horas;
                  return (
                    <td key={day.fecha} className="border-t border-border p-1">
                      {filled ? (
                        day.ok ? (
                          <span className="block rounded-sm border border-brand-border bg-brand-tint px-1 py-2 text-xs font-medium text-brand-ink">
                            Práctica
                          </span>
                        ) : (
                          <span className="block rounded-sm border border-status-error bg-status-error-bg px-1 py-2 text-xs font-medium text-status-error">
                            <span aria-hidden="true">✕ </span>Sin cupo
                          </span>
                        )
                      ) : (
                        <span className="block py-2 text-text-disabled" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-2 md:hidden" aria-label="Días de tu horario">
        {days.map((day) => {
          const partial = day.horas < maxHours;
          return (
            <li
              key={day.fecha}
              className={`rounded-sm border p-3 ${day.ok ? "border-border bg-bg-surface" : "border-status-error bg-status-error-bg"}`}
            >
              <p className="font-medium capitalize text-text-primary">{dayLabelLong(day.fecha)}</p>
              <p className="text-sm text-text-secondary">
                {day.horaInicio} a {day.horaFin} · {plural(day.horas, "hora", "horas")}
                {partial ? " · último día, más corto" : ""}
              </p>
              {!day.ok ? (
                <p className="mt-1 text-sm font-medium text-status-error">
                  {day.motivo ?? "Falta disponibilidad este día."}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
