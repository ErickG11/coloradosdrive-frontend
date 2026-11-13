"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { attendanceLabel, correctionDeadline } from "@/lib/utils/practiceAttendance";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
import { blockTime, slotEnd, type AgendaBlock, type AgendaSlot } from "../../_lib/instructorAgenda";
import { CourseTypeBadge } from "../../_components/CourseTypeBadge";
import { SlotAttendance } from "./SlotAttendance";
import { correctable, registrable, type Failure } from "../useAttendance";

export function AttendanceBlock({
  block,
  now,
  busy,
  failures,
  run,
}: {
  block: AgendaBlock;
  now: number;
  busy: boolean;
  failures: Record<string, Failure>;
  run: (
    slots: AgendaSlot[],
    attended: boolean,
    motivo?: string,
    reconcile?: boolean,
  ) => Promise<void>;
}) {
  const [individual, setIndividual] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const first = block.slots[0];
  const pending = block.slots.filter(
    (s) => registrable(s, now) && s.attended === null && !failures[s.id],
  );
  const recorded = block.slots.filter((s) => s.attended !== null);
  const canCorrectBlock =
    recorded.length === block.slots.length && recorded.every((s) => correctable(s, now));
  return (
    <article
      className="min-w-0 rounded-md border border-border bg-bg-surface p-4 sm:p-5 [&_button]:!min-h-11"
      aria-label={`${first.studentName ?? "Alumno"}, ${blockTime(block)}`}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="break-words font-semibold">{first.studentName ?? "Alumno"}</h3>
          <p className="text-sm text-text-secondary">
            {blockTime(block)} · {block.minutes / 60} h
          </p>
        </div>
        <CourseTypeBadge type={first.courseType} />
      </header>
      <ul className="mb-4 divide-y divide-border">
        {block.slots.map((s) => {
          const failure = failures[s.id];
          const ended = slotEnd(s) <= now;
          const label =
            Date.parse(s.scheduledAt) > now
              ? "Próxima"
              : !ended
                ? "En curso"
                : s.status !== "completado"
                  ? "Esperando cierre de la hora"
                  : attendanceLabel(s.attended);
          const remaining = Math.max(0, correctionDeadline(s.scheduledAt, s.durationMinutes) - now);
          return (
            <li key={s.id} className="py-3" aria-label={`Hora ${formatSchoolTime(s.scheduledAt)}`}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {formatSchoolTime(s.scheduledAt)} –{" "}
                  {formatSchoolTime(new Date(slotEnd(s)).toISOString())}
                </span>
                <span>{label}</span>
              </div>
              {registrable(s, now) && s.attended !== null ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {correctable(s, now)
                    ? `Puedes corregir durante ${Math.ceil(remaining / 60000)} min más`
                    : "Pide la corrección al administrador"}
                </p>
              ) : null}
              {failure ? (
                <div className="mt-2 rounded-sm bg-status-error-bg p-3 text-sm text-status-error">
                  <p role="alert">
                    {failure.message} Hora {formatSchoolTime(s.scheduledAt)} sin guardar.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-2 !min-h-11"
                    disabled={busy}
                    onClick={() =>
                      void run([failure.slot], failure.attended, failure.motivo, failure.uncertain)
                    }
                  >
                    Reintentar hora {formatSchoolTime(s.scheduledAt)}
                  </Button>
                </div>
              ) : null}
              {individual && registrable(s, now) && !failure ? (
                <div className="mt-3">
                  <SlotAttendance
                    slot={s}
                    onSaved={() => {}}
                    submit={(slot, attended, motivo) => run([slot], attended, motivo)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {pending.length ? (
          <>
            <Button className="!min-h-11" disabled={busy} onClick={() => void run(pending, true)}>
              Asistió
            </Button>
            <Button
              variant="secondary"
              className="!min-h-11"
              disabled={busy}
              onClick={() => void run(pending, false)}
            >
              No asistió
            </Button>
          </>
        ) : null}
        {canCorrectBlock ? (
          <Button
            variant="secondary"
            className="!min-h-11"
            disabled={busy}
            onClick={() => setCorrecting(true)}
          >
            Corregir bloque
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="!min-h-11"
          disabled={busy}
          aria-expanded={individual}
          onClick={() => setIndividual(!individual)}
        >
          Ajustar por hora
        </Button>
      </div>
      {correcting ? (
        <AttendanceCorrectionDialog
          title="Corregir asistencia del bloque"
          current={
            recorded.every((s) => s.attended === recorded[0].attended) ? recorded[0].attended : null
          }
          next={null}
          endpoint=""
          onSaved={() => {}}
          onClose={() => setCorrecting(false)}
          disabledReason={canCorrectBlock ? undefined : "Pide la corrección al administrador"}
          save={({ attended, motivo }) =>
            run(
              recorded.filter((s) => s.attended !== attended),
              attended,
              motivo,
            )
          }
        />
      ) : null}
    </article>
  );
}
