"use client";
import Image from "next/image";
import { useId, useRef, useState, type PointerEvent } from "react";
import { landingImages } from "@/lib/content/landing";
import type { StudentPayment } from "@/types/studentPayment";
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
  courseStart = null,
  courseEnd = null,
  payment = null,
}: {
  identity: EnrollmentIdentity | null;
  enrollment: PracticeHistoryEnrollment;
  cohortName: string | null;
  courseStart?: string | null;
  courseEnd?: string | null;
  payment?: StudentPayment | null;
}) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);
  const flipButton = useRef<HTMLButtonElement>(null);
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
    flipButton.current?.focus({ preventScroll: true });
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
            id={`${id}-front`}
            data-current={!flipped}
            inert={flipped}
            aria-hidden={flipped}
          >
            <div className={styles.cardFrontGrid}>
              <div className={styles.cardIdentityPane}>
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
                    <span>{enrollment.cohortId ? "Horario asignado" : "Horario por elegir"}</span>
                  </div>
                </div>
                <div className={styles.cardBottom}>
                  <span>N.º {shortEnrollmentId(enrollment.enrollmentId)}</span>
                  <EnrollmentBadge {...status} />
                </div>
              </div>
              <div className={styles.cardAccessPane}>
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
            </div>
          </div>
          <div
            className={`${styles.cardFace} ${styles.cardBack}`}
            id={`${id}-back`}
            data-current={flipped}
            inert={!flipped}
            aria-hidden={!flipped}
          >
            <div className={styles.cardPaymentHeading}>
              <EnrollmentIcon kind="payment" />
              <h2>Tu pago</h2>
            </div>
            {payment ? (
              <>
                <dl className={styles.cardPaymentData}>
                  <div>
                    <dt>Estado del último pago</dt>
                    <dd>
                      {
                        {
                          aprobado: "Aprobado",
                          pendiente: "Pendiente",
                          revision: "En revisión",
                          rechazado: "Rechazado",
                        }[payment.estado]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Total de esta transacción</dt>
                    <dd>
                      {Number.isFinite(payment.totalCentavos)
                        ? new Intl.NumberFormat("es-EC", {
                            style: "currency",
                            currency: "USD",
                          }).format(payment.totalCentavos / 100)
                        : "No disponible"}
                    </dd>
                  </div>
                  <div>
                    <dt>Confirmado</dt>
                    <dd>
                      {payment.confirmedAt
                        ? (longDate(payment.confirmedAt) ?? "No disponible")
                        : "No disponible"}
                    </dd>
                  </div>
                </dl>
                <p className={styles.informational}>
                  Este resumen corresponde al último pago. Consulta el saldo de tu matrícula con la
                  escuela.
                </p>
              </>
            ) : (
              <div className={styles.cardNoPayment}>
                <EnrollmentIcon kind="payment" />
                <p>Aún no hay pagos registrados</p>
              </div>
            )}
          </div>
        </article>
        <button
          ref={flipButton}
          className={styles.flipButton}
          type="button"
          onClick={flip}
          aria-controls={`${id}-front ${id}-back`}
          aria-pressed={flipped}
          aria-label={`${flipped ? "Ver frente" : "Ver reverso"}. Actualmente se muestra ${flipped ? "el reverso con tu pago" : "el frente con tu identidad y acceso"}.`}
        >
          <EnrollmentIcon kind="flip" />
          {flipped ? "Ver frente" : "Ver reverso"}
          <span className="sr-only"> del carné</span>
        </button>
      </div>
    </div>
  );
}
