import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
import { blockTime, pendingAttendance, type AgendaBlock } from "../_lib/instructorAgenda";
import { CourseTypeBadge } from "./CourseTypeBadge";
import { InstructorIcon, StudentAvatar } from "./InstructorVisuals";
import styles from "./agenda.module.css";

export function AgendaOverview({
  blocks,
  todayKey,
  now,
  loaded,
  weekContainsToday,
  from,
  to,
  onSelect,
}: {
  blocks: AgendaBlock[];
  todayKey: string;
  now: number | null;
  loaded: boolean;
  weekContainsToday: boolean;
  from: string;
  to: string;
  onSelect: (block: AgendaBlock) => void;
}) {
  const occupied = blocks.filter((b) => b.slots[0].studentId !== null);
  const today = occupied.filter((b) => b.date === todayKey);
  const hours = occupied.reduce((total, b) => total + b.minutes / 60, 0);
  const students = new Set(occupied.map((b) => b.slots[0].studentId)).size;
  const next = now === null ? undefined : occupied.find((b) => Date.parse(b.endsAt) > now);
  const pending =
    now === null ? 0 : blocks.reduce((total, b) => total + pendingAttendance(b, now), 0);
  const schedule = today.length
    ? `${formatSchoolTime(today[0].startsAt)} – ${formatSchoolTime(new Date(Math.max(...today.map((b) => Date.parse(b.endsAt)))).toISOString())}`
    : "Sin prácticas hoy";
  const ongoing = !!next && now !== null && Date.parse(next.startsAt) <= now;
  const delta =
    next && now !== null ? Math.max(1, Math.ceil((Date.parse(next.startsAt) - now) / 60000)) : 0;
  const countdown =
    delta < 60
      ? `en ${delta} min`
      : delta < 1440
        ? `en ${Math.floor(delta / 60)} h ${delta % 60} min`
        : `en ${Math.ceil(delta / 1440)} días`;
  const instructor = blocks[0]?.slots[0].instructorName;
  return (
    <section className={styles.overview} aria-label="Resumen de trabajo">
      <p className={styles.greeting}>
        {instructor ? `Hola, ${instructor.split(" ")[0]}.` : "Hola."} Esta es tu agenda de
        prácticas.
      </p>
      <dl className={styles.weekStats} aria-label="Resumen de hoy y de la semana">
        <div>
          <dt>
            <InstructorIcon name="calendar" />
            Bloques de hoy
          </dt>
          <dd>{loaded && weekContainsToday ? today.length : "—"}</dd>
        </div>
        <div>
          <dt>
            <InstructorIcon name="clock" />
            Horario de hoy
          </dt>
          <dd className={styles.scheduleValue}>
            {loaded && weekContainsToday ? schedule : "Consulta la semana actual"}
          </dd>
        </div>
        <div>
          <dt>
            <InstructorIcon name="clock" />
            Horas de esta semana
          </dt>
          <dd>
            {loaded ? hours : "—"}
            <span> h</span>
          </dd>
        </div>
        <div>
          <dt>
            <InstructorIcon name="people" />
            Alumnos esta semana
          </dt>
          <dd>{loaded ? students : "—"}</dd>
        </div>
      </dl>
      {loaded ? (
        <div className={styles.nextPractice} data-course={next?.slots[0].courseType ?? "unknown"}>
          <div className={styles.nextHeading}>
            <InstructorIcon name="clock" />
            <h2>Siguiente práctica</h2>
            <span className={styles.nextCountdown}>
              {next ? (ongoing ? "En curso ahora" : countdown) : "Agenda libre"}
            </span>
          </div>
          {next ? (
            <div className={styles.nextBody}>
              <StudentAvatar name={next.slots[0].studentName} type={next.slots[0].courseType} />
              <div className={styles.nextStudent}>
                <strong>{next.slots[0].studentName}</strong>
                <p>
                  {blockTime(next)} · {next.minutes / 60} h
                </p>
              </div>
              <CourseTypeBadge type={next.slots[0].courseType} />
              <Button variant="secondary" className="!min-h-11" onClick={() => onSelect(next)}>
                Ver bloque
              </Button>
            </div>
          ) : (
            <p className={styles.nextEmpty}>
              No quedan prácticas por comenzar en la semana que estás consultando.
            </p>
          )}
        </div>
      ) : null}
      {loaded && pending > 0 ? (
        <div className={styles.pendingNotice}>
          <InstructorIcon name="alert" />
          <p>
            Tienes{" "}
            <strong>
              {pending} {pending === 1 ? "hora" : "horas"} por registrar
            </strong>
          </p>
          <Link href={`/instructor/asistencias?${new URLSearchParams({ desde: from, hasta: to })}`}>
            Revisar asistencias <InstructorIcon name="arrow" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
