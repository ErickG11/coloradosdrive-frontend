import { Card } from "@/components/ui";
import type { StudentPractice, StudentSchedule as Schedule } from "@/types/student";
import { practiceRecoveryReason } from "./StudentReservations";
const statuses: Record<StudentPractice["status"], string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  liberada: "Liberada",
  pendiente_reprogramar: "Pendiente de reprogramar",
  completada: "Completada",
  sin_practica: "Sin práctica",
};
function PracticeRows({ rows }: { rows: StudentPractice[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id} className="py-3 text-sm">
          <time dateTime={row.scheduledAt} className="font-medium">
            {new Intl.DateTimeFormat("es-EC", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Guayaquil",
            }).format(new Date(row.scheduledAt))}
          </time>
          <p>
            Instructor: {row.instructor ?? "No disponible"} · {statuses[row.status]}
          </p>
          {row.durationMinutes !== null && <p>{row.durationMinutes} minutos</p>}
          {row.status === "completada" && (
            <p>
              {row.attended === null
                ? "Asistencia sin registrar"
                : row.attended
                  ? "Asistió"
                  : "No asistió"}
            </p>
          )}
          {(row.status === "liberada" || row.status === "pendiente_reprogramar") && (
            <p>{practiceRecoveryReason(row.reason)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
export function StudentSchedule({ schedule }: { schedule: Schedule }) {
  return (
    <Card title="Horario de prácticas">
      <p className="mb-3 text-sm text-text-secondary">
        Hora de Ecuador (America/Guayaquil). Solo lectura.
      </p>
      <h3 className="font-semibold">Próximas prácticas</h3>
      {schedule.upcoming.length ? (
        <PracticeRows rows={schedule.upcoming} />
      ) : (
        <p>No hay próximas prácticas reservadas.</p>
      )}
      {schedule.recovery.length > 0 && (
        <section className="mt-4" aria-label="Reservas por recuperar">
          <h3 className="font-semibold">Liberadas o pendientes de reprogramar</h3>
          <PracticeRows rows={schedule.recovery} />
        </section>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">
          Historial reciente (últimas 10 prácticas)
        </summary>
        {schedule.recent.length ? (
          <PracticeRows rows={schedule.recent} />
        ) : (
          <p>No hay prácticas anteriores registradas.</p>
        )}
      </details>
    </Card>
  );
}
