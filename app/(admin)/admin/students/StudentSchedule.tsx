"use client";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { AttendanceAuditDialog } from "./AttendanceAuditDialog";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { PracticeSlot } from "@/types/practiceSlot";
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
function PracticeRows({
  rows,
  onCorrection,
  onAudit,
}: {
  rows: StudentPractice[];
  onCorrection?: (row: StudentPractice) => void;
  onAudit?: (row: StudentPractice) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id} className="py-3 text-sm">
          <time dateTime={row.scheduledAt} className="font-medium">
            {formatPracticeDateTime(row.scheduledAt, true)}
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
          {row.status === "completada" && onCorrection ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                id={`attendance-correct-${row.id}`}
                size="sm"
                variant="secondary"
                onClick={() => onCorrection(row)}
              >
                {row.attended === null ? "Registrar asistencia" : "Corregir asistencia"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAudit?.(row)}>
                Ver auditoría
              </Button>
            </div>
          ) : null}
          {(row.status === "liberada" || row.status === "pendiente_reprogramar") && (
            <p>{practiceRecoveryReason(row.reason)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
export function StudentSchedule({
  schedule,
  onAttendanceChanged,
  onBusyChange,
}: {
  schedule: Schedule;
  onAttendanceChanged?: (slotId: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [target, setTarget] = useState<{
    row: StudentPractice;
    mode: "correction" | "audit";
  } | null>(null);
  const [updates, setUpdates] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    onBusyChange?.(target !== null);
    return () => onBusyChange?.(false);
  }, [target, onBusyChange]);
  const rows = (items: StudentPractice[]) =>
    items.map((row) => ({ ...row, attended: updates[row.id] ?? row.attended }));
  const actions = onAttendanceChanged
    ? {
        onCorrection: (row: StudentPractice) => {
          setSaved(false);
          setTarget({ row, mode: "correction" });
        },
        onAudit: (row: StudentPractice) => setTarget({ row, mode: "audit" }),
      }
    : {};
  function didSave(slot: PracticeSlot) {
    setUpdates((previous) => ({ ...previous, [slot.id]: slot.attended! }));
    setTarget(null);
    setSaved(true);
    onAttendanceChanged?.(slot.id);
  }
  return (
    <Card title="Horario de prácticas">
      <p className="mb-3 text-sm text-text-secondary">
        Hora de Ecuador (America/Guayaquil).{" "}
        {onAttendanceChanged
          ? "Las correcciones requieren motivo y quedan auditadas."
          : "Solo lectura."}
      </p>
      {saved ? (
        <p role="status" className="mb-3 text-sm text-status-success">
          La asistencia se guardó correctamente.
        </p>
      ) : null}
      <h3 className="font-semibold">Próximas prácticas</h3>
      {schedule.upcoming.length ? (
        <PracticeRows rows={rows(schedule.upcoming)} {...actions} />
      ) : (
        <p>No hay próximas prácticas reservadas.</p>
      )}
      {schedule.recovery.length > 0 && (
        <section className="mt-4" aria-label="Reservas por recuperar">
          <h3 className="font-semibold">Liberadas o pendientes de reprogramar</h3>
          <PracticeRows rows={rows(schedule.recovery)} {...actions} />
        </section>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">
          Historial reciente (últimas 10 prácticas)
        </summary>
        {schedule.recent.length ? (
          <PracticeRows rows={rows(schedule.recent)} {...actions} />
        ) : (
          <p>No hay prácticas anteriores registradas.</p>
        )}
      </details>
      {target?.mode === "correction" ? (
        <AttendanceCorrectionDialog
          key={target.row.id}
          current={target.row.attended}
          next={target.row.attended === null ? null : !target.row.attended}
          title={target.row.attended === null ? "Registrar asistencia" : "Corregir asistencia"}
          endpoint={`/practice-slots/${target.row.id}/attendance/correction`}
          onSaved={didSave}
          onClose={() => setTarget(null)}
        />
      ) : null}
      {target?.mode === "audit" ? (
        <AttendanceAuditDialog
          key={target.row.id}
          slotId={target.row.id}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </Card>
  );
}
