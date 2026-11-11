"use client";
import { useEffect, useId, useRef } from "react";
import type { DocumentoFisicoEstado } from "@/types/inscripcion";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/buttonStyles";
import {
  deadlineInfo,
  documentName,
  documentProgress,
  documentState,
  isExempt,
  ordinalInstant,
  SCHOOL_ZONE,
} from "./documentsModel";
import { DeliveredCount, DocumentBadge, DocumentIcon } from "./DocumentsVisual";
import styles from "./documents.module.css";

function DocumentArc({
  document,
  index,
  total,
  expired,
  gradientId,
}: {
  document: DocumentoFisicoEstado;
  index: number;
  total: number;
  expired: boolean;
  gradientId: string;
}) {
  const outline = useRef<SVGCircleElement>(null),
    hollow = useRef<SVGCircleElement>(null),
    fill = useRef<SVGCircleElement>(null);
  const drawn = useRef(false);
  const gap = Math.min(2.4, (100 / total) * 0.16);
  const length = 100 / total - gap;
  const rotation = -90 + (index * 360) / total + gap * 1.8;
  const delivered = document.estado === "entregado";
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const first = !drawn.current;
    if (reduced.matches) return;
    const started = requestAnimationFrame(() => {
      drawn.current = true;
    });
    const draw = (element: SVGCircleElement | null, delay: number) => {
      if (element?.animate)
        animations.push(
          element.animate(
            [{ strokeDasharray: "0 100" }, { strokeDasharray: `${length} ${100 - length}` }],
            { duration: 420, delay, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
          ),
        );
    };
    if (first) {
      draw(outline.current, index * 35);
      draw(hollow.current, index * 35);
    }
    if (delivered) draw(fill.current, first ? index * 35 : 0);
    const cancel = () => animations.forEach((animation) => animation.cancel());
    reduced.addEventListener("change", cancel);
    return () => {
      cancelAnimationFrame(started);
      cancel();
      reduced.removeEventListener("change", cancel);
    };
  }, [delivered, index, length]);
  const arc = {
    cx: 60,
    cy: 60,
    r: 50,
    pathLength: 100,
    transform: `rotate(${rotation} 60 60)`,
    style: { strokeDasharray: `${length} ${100 - length}` },
  };
  return (
    <g data-state={documentState(document, expired).tone}>
      <circle ref={outline} {...arc} className={styles.arcOutline} />
      <circle ref={hollow} {...arc} className={styles.arcHollow} />
      {delivered ? (
        <circle
          ref={fill}
          {...arc}
          className={styles.arcDelivered}
          stroke={`url(#${gradientId})`}
        />
      ) : null}
    </g>
  );
}

function ProgressRing({
  documents,
  received,
  expired,
}: {
  documents: DocumentoFisicoEstado[];
  received: number;
  expired: boolean;
}) {
  const gradientId = `documents-progress-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      className={styles.ring}
      role={documents.length > 0 ? "progressbar" : "img"}
      aria-label={documents.length > 0 ? "Documentos entregados" : "No hay documentos exigibles"}
      aria-valuemin={documents.length > 0 ? 0 : undefined}
      aria-valuemax={documents.length > 0 ? documents.length : undefined}
      aria-valuenow={documents.length > 0 ? received : undefined}
      aria-valuetext={
        documents.length > 0
          ? `${received} de ${documents.length} documentos entregados`
          : undefined
      }
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="var(--status-confirmed-fg)" />
            <stop offset="100%" stopColor="var(--color-avatar-1)" />
          </linearGradient>
        </defs>
        {documents.length ? (
          documents.map((document, index) => (
            <DocumentArc
              key={document.tipo}
              document={document}
              index={index}
              total={documents.length}
              expired={expired}
              gradientId={gradientId}
            />
          ))
        ) : (
          <circle className={styles.ringTrack} cx="60" cy="60" r="50" />
        )}
      </svg>
      <div className={styles.ringCenter}>
        <strong>
          {documents.length ? (
            <>
              <DeliveredCount value={received} />
              <span>/{documents.length}</span>
            </>
          ) : (
            "—"
          )}
        </strong>
        <span>entregados</span>
      </div>
    </div>
  );
}

export function DocumentsProgress({
  documents,
  expired,
  refreshing,
  onRefresh,
  onSelect,
}: {
  documents: DocumentoFisicoEstado[];
  expired: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (type: string) => void;
}) {
  const { applicable, received } = documentProgress(documents);
  const complete = applicable.length > 0 && received === applicable.length;
  return (
    <section
      className={styles.progressCard}
      data-state={complete ? "confirmed" : applicable.length === 0 ? "cancelled" : "pending-review"}
      aria-labelledby="documents-progress-heading"
    >
      <h2 id="documents-progress-heading">Tu lista de entrega</h2>
      <p className={styles.progressMessage}>
        {complete
          ? "¡Entrega completa!"
          : applicable.length === 0
            ? "No tienes documentos exigibles"
            : received === 0
              ? "Aún no has entregado ninguno"
              : `Te faltan ${applicable.length - received}`}
      </p>
      {complete ? (
        <p className={styles.secondary}>La escuela ya recibió todos tus documentos.</p>
      ) : null}
      <div className={styles.progressBody}>
        <ProgressRing documents={applicable} received={received} expired={expired} />
        <ul className={styles.documentLegend} aria-label="Documentos del anillo">
          {documents.map((document) => {
            const state = documentState(document, expired),
              delivered = document.estado === "entregado" && !isExempt(document);
            return (
              <li key={document.tipo}>
                <button
                  type="button"
                  className={styles.legendRow}
                  data-type={document.tipo}
                  data-delivered={delivered || undefined}
                  onClick={() => onSelect(document.tipo)}
                  aria-label={`Ver ${documentName(document)}: ${state.label}`}
                >
                  <span className={styles.legendTypeIcon}>
                    <DocumentIcon kind={document.tipo} />
                  </span>
                  <span className={styles.legendTitle}>{documentName(document)}</span>
                  <span
                    className={styles.legendState}
                    data-state={state.tone}
                    role="img"
                    aria-label={state.label}
                    title={state.label}
                  >
                    <DocumentIcon kind={state.icon} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {documents.some(isExempt) ? (
        <p className={styles.progressFootnote}>
          Los documentos marcados como No aplica quedan fuera del total.
        </p>
      ) : null}
      <div className={styles.progressFooter}>
        <span className={styles.liveDot} aria-hidden="true" />
        <p>La escuela actualiza este estado cuando recibe tus documentos.</p>
        <Button
          variant="ghost"
          aria-label="Actualizar documentos"
          aria-busy={refreshing || undefined}
          disabled={refreshing}
          onClick={onRefresh}
          className={styles.refreshButton}
        >
          <DocumentIcon
            kind="refresh"
            className={refreshing ? styles.spinningIcon : styles.smallIcon}
          />
        </Button>
      </div>
    </section>
  );
}

function DeadlineGraphic({
  ordinal,
  days,
  complete,
  serverNow,
}: {
  ordinal: number;
  days: number | null;
  complete: boolean;
  serverNow: string;
}) {
  const serverInstant = Date.parse(serverNow);
  const today =
    days !== null
      ? ordinalInstant(ordinal - days)
      : Number.isFinite(serverInstant)
        ? serverInstant
        : null;
  if (today === null) return null;
  const limit = ordinalInstant(ordinal);
  const expired = !complete && days !== null && days < 0;
  const sameDay = days === 0;
  const format = (instant: number) =>
    new Intl.DateTimeFormat("es-EC", {
      timeZone: SCHOOL_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(instant);
  const markers =
    limit < today
      ? [
          { label: "Fecha límite", instant: limit, current: false },
          { label: "Hoy", instant: today, current: true },
        ]
      : [
          { label: "Hoy", instant: today, current: true },
          { label: "Fecha límite", instant: limit, current: false },
        ];
  const caption = complete
    ? "Entrega completa"
    : sameDay
      ? "Vence hoy"
      : expired
        ? `${Math.abs(days!)} ${days === -1 ? "día" : "días"} de retraso`
        : days === 1
          ? "Te queda 1 día"
          : `Te quedan ${days} días`;
  return (
    <div
      className={styles.deadlineTimeline}
      data-expired={expired || undefined}
      data-today={sameDay || undefined}
      aria-label={`Plazo de entrega: ${caption}`}
    >
      <p className={styles.timelineCaption}>
        {complete ? <DocumentIcon kind="check" className={styles.smallIcon} /> : null}
        {caption}
      </p>
      <div className={styles.timelineLine} aria-hidden="true">
        <i data-current={markers[0].current || undefined} />
        {sameDay ? null : <i data-current={markers[1].current || undefined} />}
      </div>
      <div className={styles.timelineDates}>
        {markers.map((marker) => (
          <div key={marker.label}>
            <span>{marker.label}</span>
            <time dateTime={new Date(marker.instant).toISOString()}>{format(marker.instant)}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsDeadline({
  data,
  contactHref,
}: {
  data: StudentEnrollmentState;
  contactHref: string | null;
}) {
  const deadline = deadlineInfo(data),
    { applicable, received } = documentProgress(data.documentosFisicos);
  const complete = data.documentosFisicos.length > 0 && received === applicable.length;
  const tone = complete
    ? "confirmed"
    : deadline.days === null
      ? "cancelled"
      : deadline.expired
        ? "missed"
        : deadline.days <= 2
          ? "pending-review"
          : "scheduled";
  const needsContact = !complete && deadline.days !== null && deadline.days <= 2;
  const caption = complete
    ? applicable.length > 0
      ? "Entrega completa"
      : "Sin entregas pendientes"
    : deadline.days === null
      ? "Plazo por definir"
      : deadline.days < 0
        ? `El plazo venció hace ${Math.abs(deadline.days)} ${deadline.days === -1 ? "día" : "días"}`
        : deadline.days === 0
          ? "Vence hoy"
          : deadline.days === 1
            ? "Te queda 1 día"
            : `Te quedan ${deadline.days} días`;
  return (
    <section
      className={styles.deadlineCard}
      data-state={tone}
      aria-labelledby="documents-deadline-heading"
    >
      <div className={styles.deadlineHeading}>
        <span className={styles.deadlineIcon}>
          <DocumentIcon kind={complete ? "check" : "clock"} />
        </span>
        <h2 id="documents-deadline-heading">Fecha límite de entrega</h2>
      </div>
      <p className={styles.deadlineCaption}>{caption}</p>
      {deadline.date ? (
        <time dateTime={data.fechaLimite!} className={styles.deadlineDate}>
          {deadline.date}
        </time>
      ) : (
        <p className={styles.secondary}>La escuela te indicará la fecha de entrega.</p>
      )}
      {complete ? (
        <DocumentBadge
          label={applicable.length > 0 ? "Documentos entregados" : "No tienes documentos exigibles"}
          tone="confirmed"
          icon="check"
        />
      ) : null}
      {deadline.ordinal !== null && (deadline.days !== null || complete) ? (
        <DeadlineGraphic
          ordinal={deadline.ordinal}
          days={deadline.days}
          complete={complete}
          serverNow={data.serverNow}
        />
      ) : null}
      {needsContact ? (
        <div className={styles.deadlineAction}>
          <p>
            {deadline.expired
              ? "Contacta a la escuela para entregar lo pendiente."
              : "Coordina la entrega de lo que falta antes del límite."}
          </p>
          {contactHref ? (
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName("primary", "md", styles.contactAction)}
            >
              <DocumentIcon kind="whatsapp" />
              Contactar a la escuela
            </a>
          ) : null}
        </div>
      ) : null}
      <p className={styles.deadlineNote}>
        <DocumentIcon kind="info" className={styles.smallIcon} />
        {data.origen === "solicitud"
          ? "Tu plazo se calcula con la fecha de tu primera práctica asignada."
          : "Fecha límite informada por la escuela para tu matrícula."}
      </p>
    </section>
  );
}
