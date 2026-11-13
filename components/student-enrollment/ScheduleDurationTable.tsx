import type { StudentPlanRules } from "@/types/studentSchedule";
import { dayLabel } from "./scheduleFormat";
export function ScheduleDurationTable({ rules }: { rules: StudentPlanRules }) {
  if (!rules.active) return null;
  return (
    <details className="my-4 rounded-sm border border-border p-3">
      <summary className="cursor-pointer font-medium">
        Comparar duración de las opciones de práctica
      </summary>
      <p className="mt-2 text-sm text-text-secondary">
        Referencia desde el próximo día de cada modalidad. Tu plan mostrará las fechas exactas antes
        de reservar.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Duraciones según modalidad y horas diarias</caption>
          <thead>
            <tr>
              <th scope="col">Modalidad</th>
              <th scope="col">Horas/día</th>
              <th scope="col">Días de práctica</th>
              <th scope="col">Inicio de referencia</th>
              <th scope="col">Fin real</th>
            </tr>
          </thead>
          <tbody>
            {rules.options.map((o) => (
              <tr key={`${o.modalidad}-${o.horasPorDia}`} className="border-t border-border">
                <th scope="row" className="py-2 font-normal">
                  {o.modalidad === "entre_semana" ? "Entre semana" : "Fin de semana"}
                </th>
                <td>
                  {o.horasPorDia}
                  {!o.habilitada ? " · No disponible" : ""}
                </td>
                <td>{o.sesiones}</td>
                <td>{dayLabel(o.primeraFecha)}</td>
                <td>{dayLabel(o.ultimaFecha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
