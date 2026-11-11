"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type PointerEvent } from "react";
import { buttonClassName } from "@/components/ui/Button";
import { EnrollmentBadge, EnrollmentIcon } from "@/components/student-enrollment/EnrollmentVisual";
import { enrollmentStatus, licenseLabel } from "@/components/student-enrollment/enrollmentModel";
import type { PracticeHistoryEnrollment, PracticeHistoryPage } from "@/types/practiceAttendance";
import { useDashboardViewport } from "./useDashboardData";
import { courseHref, greeting, nextPracticeCopy, number, percentage } from "./dashboardModel";
import styles from "./dashboard.module.css";

export function DashboardHero({
  enrollment,
  name,
  cohort,
  next,
  now,
  practices,
  content,
  bestScore,
  continueCourse,
  practiceError,
}: {
  enrollment: PracticeHistoryEnrollment;
  name: string | null;
  cohort: string | null;
  next: string | null;
  now: number | null;
  practices: PracticeHistoryPage["summary"] | null;
  content: number | null;
  bestScore: number | null;
  continueCourse: boolean;
  practiceError: boolean;
}) {
  const { ref: viewportRef, running } = useDashboardViewport();
  const stage = useRef<HTMLDivElement>(null),
    bounds = useRef<DOMRect | null>(null),
    frame = useRef(0);
  const reduced = useReducedMotion();
  const isMoto = enrollment.courseType === "A";
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function enter(event: PointerEvent<HTMLDivElement>) {
    bounds.current = event.currentTarget.getBoundingClientRect();
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      reduced ||
      !bounds.current ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const rect = bounds.current,
      x = (event.clientX - rect.left) / rect.width - 0.5,
      y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      stage.current?.style.setProperty("--vehicle-x", `${x * 16}px`);
      stage.current?.style.setProperty("--vehicle-y", `${y * 12}px`);
      stage.current?.style.setProperty("--glow-x", `${x * 28}px`);
      stage.current?.style.setProperty("--glow-y", `${y * 20}px`);
    });
  }
  function reset() {
    cancelAnimationFrame(frame.current);
    for (const property of ["--vehicle-x", "--vehicle-y", "--glow-x", "--glow-y"])
      stage.current?.style.setProperty(property, "0px");
  }
  const hud = [
    ...(content !== null ? [{ label: "Contenido", value: percentage(content) }] : []),
    ...(practices
      ? [
          {
            label: "Práctica",
            value:
              practices.horasObjetivo !== null
                ? `${number(practices.horasAsistidas)} de ${number(practices.horasObjetivo)} h`
                : `${number(practices.horasAsistidas)} h`,
          },
        ]
      : []),
    ...(bestScore !== null ? [{ label: "Mejor nota", value: `${number(bestScore)}/100` }] : []),
  ];
  return (
    <section
      ref={viewportRef}
      className={styles.hero}
      data-vehicle={enrollment.courseType}
      data-running={running}
    >
      <div className={styles.heroCopy} key={`copy-${enrollment.enrollmentId}`}>
        <h2>{greeting(name, now)}</h2>
        <p className={styles.heroContext}>
          {practiceError
            ? "Consulta tus horarios para revisar tus próximas prácticas."
            : nextPracticeCopy(next, now)}
        </p>
        <div className={styles.heroChips}>
          <span className={styles.courseChip}>
            <EnrollmentIcon kind={isMoto ? "moto" : "car"} />
            {licenseLabel(enrollment.courseType)}
          </span>
          {cohort ? (
            <span className={styles.cohortChip}>
              <EnrollmentIcon kind="cohort" />
              {cohort}
            </span>
          ) : null}
          <EnrollmentBadge {...enrollmentStatus(enrollment.status)} />
        </div>
        <Link
          className={buttonClassName("primary")}
          href={next || !continueCourse ? "/student/schedule" : courseHref(enrollment.courseId)}
        >
          {next || !continueCourse ? "Ir a mis horarios" : "Continuar mi curso"}
          <EnrollmentIcon kind="arrow" />
        </Link>
      </div>
      <div
        ref={stage}
        className={styles.vehicleStage}
        onPointerEnter={enter}
        onPointerMove={move}
        onPointerLeave={reset}
      >
        <div className={styles.showroom} aria-hidden="true" />
        <div className={styles.glowParallax} aria-hidden="true">
          <div className={styles.vehicleGlow} />
        </div>
        <div className={styles.speedLines} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={styles.stageRoad} aria-hidden="true">
          <span key={enrollment.enrollmentId} className={styles.roadDashes} />
        </div>
        <div className={styles.contactShadow} aria-hidden="true" />
        <div className={styles.vehicleParallax}>
          <AnimatePresence mode="wait" initial={true}>
            <motion.div
              className={styles.vehicleArrival}
              key={enrollment.courseType}
              initial={{ x: reduced ? 0 : 95, opacity: reduced ? 0.7 : 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{
                x: reduced ? 0 : -48,
                opacity: 0,
                transition: { duration: reduced ? 0.12 : 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              transition={{ duration: reduced ? 0.12 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={
                  isMoto ? "/images/moto-colorados-drive.png" : "/images/auto-colorados-drive.png"
                }
                alt={
                  isMoto
                    ? "Moto de prácticas de Colorados Drive"
                    : "Auto de prácticas de Colorados Drive"
                }
                width={1448}
                height={1086}
                sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1279px) calc(100vw - 320px), 704px"
                priority
                className={styles.vehicleImage}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={styles.hud} aria-label="Resumen del curso">
          {hud.map((item, index) => (
            <div key={item.label} className={styles.hudPill} data-position={index}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
