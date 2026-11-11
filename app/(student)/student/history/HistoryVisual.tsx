"use client";
import { useEffect, useRef } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { hours, type HistoryState } from "./historyModel";
import styles from "./history.module.css";

export function HistoryIcon({
  kind = "calendar",
  className,
}: {
  kind?: "calendar" | "clock" | "info" | "refresh" | "chart";
  className?: string;
}) {
  const paths = {
    calendar: "M7 3v4m10-4v4M3 10h18M8 15h2m4 0h2",
    clock: "M12 7v5l3 2",
    info: "M12 11v6m0-10v.1",
    refresh: "M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
    chart: "M5 19V9m7 10V5m7 14v-7M3 21h18",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? styles.icon}
    >
      {kind === "calendar" ? (
        <rect x="3" y="5" width="18" height="16" rx="3" />
      ) : ["clock", "info"].includes(kind) ? (
        <circle cx="12" cy="12" r="9" />
      ) : null}
      <path d={paths[kind]} />
    </svg>
  );
}
export function HistoryStateIcon({
  state,
  className = styles.smallIcon,
}: {
  state: HistoryState;
  className?: string;
}) {
  return state.icon === "check" ? (
    <CheckIcon className={className} />
  ) : state.icon === "cross" ? (
    <XIcon className={className} />
  ) : (
    <HistoryIcon kind={state.icon} className={className} />
  );
}
export function HistoryBadge({ state }: { state: HistoryState }) {
  return (
    <span className={styles.badge} data-state={state.tone}>
      <HistoryStateIcon state={state} />
      {state.label}
    </span>
  );
}
export function Instructor({ name, compact = false }: { name: string; compact?: boolean }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const tone = [...initials].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % 6;
  return (
    <span className={styles.instructor} data-compact={compact || undefined}>
      <span className={styles.avatar} data-avatar={tone} aria-hidden="true">
        {initials}
      </span>
      <span>{name}</span>
    </span>
  );
}
export function AnimatedNumber({ value, percent = false }: { value: number; percent?: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const label = (number: number) => (percent ? `${Math.round(number)} %` : hours(number));
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const from = previous.current;
    previous.current = value;
    let frame = 0;
    const start = performance.now();
    const format = (number: number) => (percent ? `${Math.round(number)} %` : hours(number));
    function finish() {
      cancelAnimationFrame(frame);
      if (element) element.textContent = format(value);
    }
    function tick(now: number) {
      if (preference.matches) {
        finish();
        return;
      }
      const fraction = Math.min(1, (now - start) / 700);
      if (element) element.textContent = format(from + (value - from) * (1 - (1 - fraction) ** 3));
      if (fraction < 1) frame = requestAnimationFrame(tick);
    }
    if (preference.matches) finish();
    else frame = requestAnimationFrame(tick);
    preference.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", finish);
    };
  }, [value, percent]);
  return (
    <>
      <span ref={node} aria-hidden="true">
        {label(value)}
      </span>
      <span className="sr-only">{label(value)}</span>
    </>
  );
}
export function HistorySkeleton() {
  return (
    <div className={styles.skeletonLayout} role="status" aria-label="Cargando tu historial">
      <div className={`${styles.skeleton} ${styles.heroSkeleton}`} />
      <div className={styles.kpis}>
        {[1, 2, 3].map((id) => (
          <div key={id} className={`${styles.skeleton} ${styles.kpiSkeleton}`} />
        ))}
      </div>
      <div className={styles.layout}>
        <div>
          {[1, 2, 3].map((id) => (
            <div key={id} className={`${styles.skeleton} ${styles.rowSkeleton}`} />
          ))}
        </div>
        <div className={`${styles.skeleton} ${styles.railSkeleton}`} />
      </div>
    </div>
  );
}
