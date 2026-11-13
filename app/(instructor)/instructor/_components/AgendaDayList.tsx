"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui";
import {
  attendanceHref,
  blockTime,
  hasEndedHour,
  STATUS_LABELS,
  type AgendaBlock,
} from "../_lib/instructorAgenda";
import { CourseTypeBadge } from "./CourseTypeBadge";
import styles from "./agenda.module.css";

export function AgendaBlockCard({
  block,
  now,
  onSelect,
  compact = false,
}: {
  block: AgendaBlock;
  now: number;
  onSelect: (block: AgendaBlock) => void;
  compact?: boolean;
}) {
  const first = block.slots[0];
  const free = first.studentId === null;
  return (
    <article
      className={`${styles.blockCard} ${free ? styles.freeBlock : ""}`}
      aria-label={`Bloque ${blockTime(block)}`}
    >
      <button
        type="button"
        className={styles.blockButton}
        onClick={() => onSelect(block)}
        aria-label={`Ver bloque de ${first.studentName ?? "sin alumno"}, ${blockTime(block)}`}
      >
        <span className={styles.blockTop}>
          <time dateTime={block.startsAt}>{blockTime(block)}</time>
          <span className={styles.blockState}>{STATUS_LABELS[block.status]}</span>
        </span>
        <span className={styles.studentName}>
          {first.studentName ?? (block.status === "sin_practica" ? "Sin alumno" : "Libre")}
        </span>
        <CourseTypeBadge type={first.courseType} />
      </button>
      {block.identityPending ? (
        <Link className={styles.identityLink} href={attendanceHref(block.date, block.id)}>
          Primer día: confirmar cédula
        </Link>
      ) : null}
      {!compact && hasEndedHour(block, now) ? (
        <Link className={styles.attendanceLink} href={attendanceHref(block.date, block.id)}>
          Ir a asistencias <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}

export function AgendaDayList({
  blocks,
  now,
  onSelect,
}: {
  blocks: AgendaBlock[];
  now: number;
  onSelect: (block: AgendaBlock) => void;
}) {
  if (!blocks.length)
    return (
      <EmptyState
        title="No tienes bloques este día."
        description="Consulta otro día o vuelve a hoy para revisar tu agenda."
      />
    );
  return (
    <div className={styles.dayList}>
      {blocks.map((block) => (
        <AgendaBlockCard key={block.id} block={block} now={now} onSelect={onSelect} />
      ))}
    </div>
  );
}
