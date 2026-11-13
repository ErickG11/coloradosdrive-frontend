"use client";

import Link from "next/link";
import { Modal, StatusBadge, buttonClassName } from "@/components/ui";
import { formatSchoolTime, parseSchoolDateKey } from "@/lib/utils/schoolTime";
import {
  attendanceHref,
  blockTime,
  formatDayLabel,
  hasEndedHour,
  slotEnd,
  STATUS_LABELS,
  type AgendaBlock,
} from "../_lib/instructorAgenda";
import { CourseTypeBadge } from "./CourseTypeBadge";
import styles from "./agenda.module.css";

export function AgendaBlockDetail({
  block,
  now,
  wide,
  onClose,
}: {
  block: AgendaBlock;
  now: number;
  wide: boolean;
  onClose: () => void;
}) {
  const first = block.slots[0];
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Detalle del bloque"
      placement={wide ? "right" : "center"}
    >
      <p className="mb-1 text-sm text-text-secondary">
        {formatDayLabel(parseSchoolDateKey(block.date)!)}
      </p>
      <p className="mb-4 text-xl font-semibold text-text-primary">
        {first.studentName ?? "Sin alumno"}
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <CourseTypeBadge type={first.courseType} />
        <StatusBadge status={block.status} label={STATUS_LABELS[block.status]} />
      </div>
      <dl className={styles.detailList}>
        <div>
          <dt>Cohorte</dt>
          <dd>{first.cohortName ?? "Cohorte sin información"}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{blockTime(block)}</dd>
        </div>
        <div>
          <dt>Duración</dt>
          <dd>{block.minutes / 60} h</dd>
        </div>
      </dl>
      <h3 className="mb-2 mt-6 text-sm font-semibold">Horas del bloque</h3>
      <ul className="mb-6 divide-y divide-border">
        {block.slots.map((slot) => (
          <li
            key={slot.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
          >
            <span>
              {formatSchoolTime(slot.scheduledAt)} –{" "}
              {formatSchoolTime(new Date(slotEnd(slot)).toISOString())}
            </span>
            <span>{STATUS_LABELS[slot.status]}</span>
          </li>
        ))}
      </ul>
      {block.identityPending ? (
        <Link href={attendanceHref(block.date, block.id)} className={`${styles.identityLink} mb-4`}>
          Primer día: confirmar cédula
        </Link>
      ) : null}
      {hasEndedHour(block, now) ? (
        <Link
          href={attendanceHref(block.date, block.id)}
          className={buttonClassName("primary", "md", "!min-h-11 w-full")}
        >
          Ir a asistencias
        </Link>
      ) : null}
      <p className="mt-4 text-xs text-text-secondary">Hora de Ecuador (America/Guayaquil)</p>
    </Modal>
  );
}
