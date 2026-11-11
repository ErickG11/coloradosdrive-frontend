"use client";
import Image from "next/image";
import { useId, useRef, useState, type PointerEvent } from "react";
import { landingImages } from "@/lib/content/landing";
import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import {
  accountRole,
  enrollmentStatus,
  licenseLabel,
  longDate,
  shortEnrollmentId,
  type EnrollmentIdentity,
} from "./enrollmentModel";
import { EnrollmentBadge, EnrollmentIcon } from "./EnrollmentVisual";
import styles from "./enrollment-overview.module.css";

export function EnrollmentCard({
  identity,
  enrollment,
  cohortName,
  courseStart = null,
  courseEnd = null,
}: {
  identity: EnrollmentIdentity | null;
  enrollment: PracticeHistoryEnrollment;
  cohortName: string | null;
  courseStart?: string | null;
  courseEnd?: string | null;
}) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);
  const id = useId();
  const status = enrollmentStatus(enrollment.status);
  const mask = identity?.cedula ? `••••••${identity.cedula.slice(-4)}` : null;
  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (
      !tilt.current ||
      event.pointerType !== "mouse" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    tilt.current.style.setProperty(
      "--card-tilt-x",
      `${(0.5 - (event.clientY - rect.top) / rect.height) * 5}deg`,
    );
    tilt.current.style.setProperty(
      "--card-tilt-y",
      `${((event.clientX - rect.left) / rect.width - 0.5) * 5}deg`,
    );
  }
  function resetTilt() {
    tilt.current?.style.setProperty("--card-tilt-x", "0deg");
    tilt.current?.style.setProperty("--card-tilt-y", "0deg");
  }
  function flip() {
    setFlipped((value) => !value);
    setRevealed(false);
  }
  return (
    <div className={styles.cardStage} onPointerMove={followPointer} onPointerLeave={resetTilt}>
      <div ref={tilt} className={styles.cardTilt}>
        <article
          className={styles.credential}
          data-flipped={flipped}
          aria-label="Carné digital de estudiante"
        >
          <div
            className={styles.cardFace}
            data-current={!flipped}
            inert={flipped}
            aria-hidden={flipped}
          >
            <div className={styles.cardBrand}>
              <Image
                src={landingImages.logo.src}
                alt={landingImages.logo.alt}
                width={148}
                height={74}
                className={styles.logo}
              />
              <span>Estudiante</span>
            </div>
            <div className={styles.cardIdentity}>
              <h2>{identity?.name ?? "Tu ficha de estudiante"}</h2>
              {mask ? (
                <div className={styles.cedula}>
                  <span>Cédula: {revealed ? identity!.cedula : mask}</span>
                  <button
                    type="button"
                    aria-label={revealed ? "Ocultar cédula" : "Revelar cédula"}
                    aria-pressed={revealed}
                    onClick={() => setRevealed((value) => !value)}
                  >
                    <EnrollmentIcon kind={revealed ? "eye-off" : "eye"} />
                  </button>
                </div>
              ) : (
                <p>Tu cédula aún no está disponible aquí.</p>
              )}
            </div>
            <div className={styles.cardCourse}>
              <EnrollmentIcon kind={enrollment.courseType === "A" ? "moto" : "car"} />
              <div>
                <strong>{licenseLabel(enrollment.courseType)}</strong>
                <span>
                  {cohortName ?? (enrollment.cohortId ? "Cohorte asignada" : "Cohorte por asignar")}
                </span>
              </div>
            </div>
            <div className={styles.cardBottom}>
              <span>N.º {shortEnrollmentId(enrollment.enrollmentId)}</span>
              <EnrollmentBadge {...status} />
            </div>
          </div>
          <div
            className={`${styles.cardFace} ${styles.cardBack}`}
            id={`${id}-back`}
            data-current={flipped}
            inert={!flipped}
            aria-hidden={!flipped}
          >
            <h2>Tu acceso a Colorados Drive</h2>
            <dl className={styles.cardBackData}>
              <div>
                <dt>Correo de acceso</dt>
                <dd>{identity?.email ?? "No disponible"}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{accountRole(identity?.role ?? null) ?? "No disponible"}</dd>
              </div>
              {identity?.createdAt && longDate(identity.createdAt) ? (
                <div>
                  <dt>Alta de la cuenta</dt>
                  <dd>{longDate(identity.createdAt)}</dd>
                </div>
              ) : null}
              {courseStart && courseEnd && longDate(courseStart) && longDate(courseEnd) ? (
                <div>
                  <dt>Vigencia del curso</dt>
                  <dd>
                    {longDate(courseStart)} – {longDate(courseEnd)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className={styles.informational}>Documento informativo de la escuela</p>
          </div>
        </article>
        <button
          className={styles.flipButton}
          type="button"
          onClick={flip}
          aria-controls={`${id}-back`}
          aria-expanded={flipped}
        >
          <EnrollmentIcon kind="flip" />
          {flipped ? "Ver frente" : "Ver reverso"}
          <span className="sr-only"> del carné</span>
        </button>
      </div>
    </div>
  );
}
