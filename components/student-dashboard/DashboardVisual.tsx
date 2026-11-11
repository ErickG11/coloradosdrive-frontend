"use client";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useDashboardViewport } from "./useDashboardData";
import { percent, percentage } from "./dashboardModel";
import styles from "./dashboard.module.css";

export function DashboardReveal({
  children,
  label,
  placeholder = "content",
}: {
  children: ReactNode;
  label: string;
  placeholder?: string;
}) {
  const { ref: viewportRef, seen, running } = useDashboardViewport();
  return (
    <section
      ref={viewportRef}
      className={styles.reveal}
      data-seen={seen}
      data-running={running}
      aria-label={label}
    >
      {seen ? (
        children
      ) : (
        <div className={styles.sectionSkeleton} data-shape={placeholder} role="status">
          <span className="sr-only">{label}</span>
        </div>
      )}
    </section>
  );
}
export function DashboardError({ children, retry }: { children: ReactNode; retry: () => void }) {
  return (
    <div className={styles.error} role="status">
      <p>{children}</p>
      <Button variant="ghost" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );
}
export function DashboardRing({
  value,
  label,
  small = false,
  showValue = true,
}: {
  value: number;
  label: string;
  small?: boolean;
  showValue?: boolean;
}) {
  return (
    <div
      className={`${styles.ring} ${small ? styles.smallRing : ""}`}
      role="img"
      aria-label={`${label}: ${percentage(value)}`}
      style={{ "--ring-offset": 100 - percent(value) } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" />
        <circle className={styles.ringArc} cx="50" cy="50" r="42" pathLength="100" />
      </svg>
      {showValue ? <strong aria-hidden="true">{Math.round(percent(value))}<small>%</small></strong> : null}
    </div>
  );
}
export function DashboardSkeleton() {
  return (
    <div role="status" className={styles.loading}>
      <span className="sr-only">Cargando tu panel…</span>
      <div className={styles.heroSkeleton} />
      <div className={styles.sectionSkeleton} data-shape="road" />
      <div className={styles.kpiGrid}>
        {[0, 1, 2, 3].map((id) => (
          <div key={id} className={styles.kpiSkeleton} />
        ))}
      </div>
      <div className={styles.sectionSkeleton} />
      <div className={styles.sectionSkeleton} data-shape="grades" />
    </div>
  );
}
