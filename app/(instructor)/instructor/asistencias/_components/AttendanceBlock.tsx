"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { attendanceLabel, correctionDeadline } from "@/lib/utils/practiceAttendance";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
import { blockTime, slotEnd, type AgendaBlock, type AgendaSlot } from "../../_lib/instructorAgenda";
import { CourseTypeBadge } from "../../_components/CourseTypeBadge";
import { InstructorIcon, StudentAvatar } from "../../_components/InstructorVisuals";
import { SlotAttendance } from "./SlotAttendance";
import { correctable, registrable, type Failure } from "../useAttendance";
import styles from "../attendance.module.css";

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
  const hasFailure = block.slots.some((s) => failures[s.id]);
  const stateLabel = hasFailure
    ? "Requiere revisión"
    : recorded.length === block.slots.length
      ? "Registrada"
      : pending.length
        ? "Pendiente"
        : "Programada";
  return (
    <article
      className={styles.block}
      data-course={first.courseType ?? "unknown"}
      data-state={
        hasFailure ? "error" : recorded.length === block.slots.length ? "recorded" : "pending"
      }
      aria-label={`${first.studentName ?? "Alumno"}, ${blockTime(block)}`}
    >
      <header className={styles.blockHeader}>
        <StudentAvatar name={first.studentName} type={first.courseType} />
        <div className={styles.blockStudent}>
          <h3>{first.studentName ?? "Alumno"}</h3>
          <p>
            <InstructorIcon name="clock" />
            {blockTime(block)} · {block.minutes / 60} h
          </p>
        </div>
        <div className={styles.blockBadges}>
          <CourseTypeBadge type={first.courseType} />
          <span className={styles.blockStatus}>{stateLabel}</span>
        </div>
      </header>
      <ul className={styles.hours}>
        {block.slots.map((s) => {
          const failure = failures[s.id];
          const ended = slotEnd(s) <= now;
          const label = failure?.uncertain
            ? "Por verificar"
            : Date.parse(s.scheduledAt) > now
              ? "Próxima"
              : !ended
                ? "En curso"
                : s.status !== "completado"
                  ? "Esperando cierre de la hora"
                  : attendanceLabel(s.attended);
          const remaining = Math.max(
            0,
            Math.ceil((correctionDeadline(s.scheduledAt, s.durationMinutes) - now) / 60000),
          );
          const remainingText =
            remaining < 60
              ? `${remaining} min`
              : `${Math.floor(remaining / 60)} h${remaining % 60 ? ` ${remaining % 60} min` : ""}`;
          return (
            <li
              key={s.id}
              className={styles.hour}
              aria-label={`Hora ${formatSchoolTime(s.scheduledAt)}`}
              data-attended={s.attended === null ? "pending" : String(s.attended)}
            >
              <div className={styles.hourInfo}>
                <time dateTime={s.scheduledAt}>
                  {formatSchoolTime(s.scheduledAt)} –{" "}
                  {formatSchoolTime(new Date(slotEnd(s)).toISOString())}
                </time>
                <span
                  className={`${styles.stateChip} ${s.attended === true ? styles.assisted : s.attended === false ? styles.missed : styles.pending}`}
                >
                  {label}
                </span>
                {registrable(s, now) && s.attended !== null ? (
                  <p className={styles.deadline}>
                    {correctable(s, now)
                      ? `Puedes corregir durante ${remainingText} más`
                      : "Pide la corrección al administrador"}
                  </p>
                ) : null}
              </div>
              {(individual || s.attended === null) && registrable(s, now) && !failure ? (
                <div
                  className={styles.hourControls}
                  role="group"
                  aria-label={`Asistencia de las ${formatSchoolTime(s.scheduledAt)}`}
                >
                  <SlotAttendance
                    slot={s}
                    compact
                    disabled={busy}
                    onSaved={() => {}}
                    submit={(slot, attended, motivo) => run([slot], attended, motivo)}
                  />
                </div>
              ) : null}
              {failure ? (
                <div className={styles.failure}>
                  <div>
                    <InstructorIcon name="alert" />
                    <p role="alert">
                      <strong>
                        {failure.uncertain
                          ? "Resultado por verificar"
                          : `Hora ${formatSchoolTime(s.scheduledAt)} sin guardar`}
                      </strong>
                      <span>{failure.message}</span>
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="!min-h-11"
                    disabled={busy}
                    onClick={() =>
                      void run([failure.slot], failure.attended, failure.motivo, failure.uncertain)
                    }
                  >
                    Reintentar hora {formatSchoolTime(s.scheduledAt)}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <footer className={styles.blockActions}>
        <div className={styles.primaryActions}>
          {pending.length ? (
            <>
              <Button className="!min-h-11" disabled={busy} onClick={() => void run(pending, true)}>
                <InstructorIcon name="check" />
                Marcar asistió
              </Button>
              <Button
                variant="secondary"
                className="!min-h-11"
                disabled={busy}
                onClick={() => void run(pending, false)}
              >
                Marcar no asistió
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
        </div>
        {block.slots.some(
          (s) => registrable(s, now) && (s.attended === null || correctable(s, now)),
        ) ? (
          <Button
            variant="secondary"
            className="!min-h-11"
            disabled={busy}
            aria-expanded={individual}
            onClick={() => setIndividual(!individual)}
          >
            Ajustar por hora
          </Button>
        ) : null}
      </footer>
      {correcting ? (
        <AttendanceCorrectionDialog
          title="Corregir asistencia del bloque"
          current={
            recorded.length && recorded.every((s) => s.attended === recorded[0].attended)
              ? recorded[0].attended
              : null
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
