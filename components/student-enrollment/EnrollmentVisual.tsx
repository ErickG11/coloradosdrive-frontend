"use client";
import { useEffect, useRef } from "react";
import type { EnrollmentTone } from "./enrollmentModel";
import styles from "./enrollment-overview.module.css";

export type EnrollmentIconKind =
  | "car"
  | "moto"
  | "eye"
  | "eye-off"
  | "flip"
  | "access"
  | "cohort"
  | "calendar"
  | "document"
  | "payment"
  | "check"
  | "send"
  | "flag"
  | "arrow"
  | "whatsapp"
  | "refresh";
const paths: Record<EnrollmentIconKind, string> = {
  car: "m3 11 2-6h14l2 6v8h-3v-3H6v3H3zM3 11h18M6 13h2m8 0h2",
  moto: "M8 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm16 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 16l5-8h7l4 8M8 16h5l4-10-3-3h-3M7 5h4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "eye-off":
    "m3 3 18 18M10 5h2c6 0 10 7 10 7s-1 2-3 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2m-8-7a4 4 0 0 0 5 5",
  flip: "M3 8h15l-4-4m4 4-4 4M21 16H6l4 4m-4-4 4-4",
  access: "M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6zM8 12l3 3 5-6",
  cohort: "m2 10 10-7 10 7M4 9v12h16V9M9 21v-7h6v7M8 10h.01M16 10h.01",
  calendar: "M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-12 5h3m3 0h2",
  document: "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6",
  payment: "M3 6h18v13H3zM3 10h18M7 15h4",
  check: "m5 12 4 4L19 6",
  send: "m2 3 20 9-20 9 4-9-4-9Zm4 9h16",
  flag: "M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  whatsapp:
    "M20.5 11.8a8.5 8.5 0 0 1-12.4 7.5L3 21l1.7-5.1a8.5 8.5 0 1 1 15.8-4.1ZM8.2 7.5c-.9 1.2-.3 3.3 1.2 4.9s3.7 2.5 4.9 1.7l1.1-1.1-2.6-1.3-.9.8c-1.1-.4-2-1.3-2.4-2.4l.7-.8-1.2-2.5Z",
  refresh: "M20 6v6h-6M4 18v-6h6M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
};
export function EnrollmentIcon({
  kind,
  className,
}: {
  kind: EnrollmentIconKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? styles.icon}
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function EnrollmentBadge({
  label,
  tone,
  live = false,
}: {
  label: string;
  tone: EnrollmentTone;
  live?: boolean;
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {live ? (
        <span className={styles.liveDot} aria-hidden="true" />
      ) : (
        <EnrollmentIcon kind={tone === "confirmed" ? "check" : "flag"} />
      )}
      {label}
    </span>
  );
}
export function EnrollmentCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const format = (number: number) =>
      new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(number);
    const finish = () => {
      cancelAnimationFrame(frame);
      element.textContent = format(value);
    };
    if (media.matches) {
      finish();
      return;
    }
    const started = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - started) / 240);
      element.textContent = format(value * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    media.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", finish);
    };
  }, [value]);
  return (
    <>
      <span className="sr-only">
        {new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(value)}
      </span>
      <span aria-hidden="true" ref={ref}>
        {new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(value)}
      </span>
    </>
  );
}
export function EnrollmentSkeleton() {
  return (
    <div className={styles.skeleton} role="status">
      <span className="sr-only">Cargando tu ficha de matrícula…</span>
      <div className={styles.skeletonCard} />
      <div className={styles.detailGrid}>
        {[0, 1, 2, 3].map((item) => (
          <div className={styles.skeletonData} key={item} />
        ))}
      </div>
    </div>
  );
}
