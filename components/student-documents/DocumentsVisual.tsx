"use client";
import { useEffect, useRef } from "react";
import type { DocumentTone } from "./documentsModel";
import styles from "./documents.module.css";

export type DocumentIconKind =
  | "cedula"
  | "tipo_sangre"
  | "papeleta_votacion"
  | "titulo_bachiller"
  | "document"
  | "shield"
  | "print"
  | "contact"
  | "whatsapp"
  | "refresh"
  | "info"
  | "clock"
  | "check"
  | "minus"
  | "gather"
  | "school";
export function DocumentIcon({
  kind = "document",
  className,
}: {
  kind?: DocumentIconKind | string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    cedula: "M3 6h18v13H3zM3 9h18M13 12h5m-5 4h4M6 16v-1a2 2 0 0 1 4 0v1M8 11.5h.01",
    tipo_sangre: "M12 3c-2 4-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11ZM9 14a3 3 0 0 0 3 3",
    papeleta_votacion: "m8 3 8 3-3 8-8-3zM4 12H2v9h20v-9h-5M8 16h8m-7-8 2 2 3-4",
    titulo_bachiller: "m2 8 10-5 10 5-10 5zM6 10v6c4 3 8 3 12 0v-6m4-2v8",
    document: "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6",
    shield: "M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6zM8 12l3 3 5-6",
    print: "M7 8V3h10v5M7 16H4V8h16v8h-3M7 13h10v8H7z",
    contact: "M21 11a9 9 0 0 1-9 9H5l-4 2 2-6a9 9 0 1 1 18-5ZM8 10h8m-8 4h5",
    whatsapp:
      "M20.5 11.8a8.5 8.5 0 0 1-12.4 7.5L3 21l1.7-5.1a8.5 8.5 0 1 1 15.8-4.1ZM8.2 7.5c-.9 1.2-.3 3.3 1.2 4.9s3.7 2.5 4.9 1.7l1.1-1.1-2.6-1.3-.9.8c-1.1-.4-2-1.3-2.4-2.4l.7-.8-1.2-2.5Z",
    refresh: "M20 6v6h-6M4 18v-6h6M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
    info: "M12 11v6m0-10v.1",
    clock: "M12 7v5l3 2",
    check: "m5 12 4 4L19 6",
    minus: "M6 12h12",
    gather: "M8 3h10v15H8zM5 6H3v15h12v-1m-4-13h4m-4 4h4",
    school: "m2 10 10-7 10 7M4 9v12h16V9M9 21v-7h6v7M8 10h.01M16 10h.01",
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
      {kind === "info" || kind === "clock" ? <circle cx="12" cy="12" r="9" /> : null}
      <path
        d={paths[kind] ?? paths.document}
        className={kind === "check" ? styles.drawCheck : undefined}
      />
    </svg>
  );
}
export function DocumentBadge({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: DocumentTone;
  icon: "check" | "clock" | "minus";
}) {
  return (
    <span key={`${tone}:${label}`} className={styles.badge} data-state={tone}>
      <DocumentIcon kind={icon} className={styles.smallIcon} />
      {label}
    </span>
  );
}
export function DeliveredCount({ value }: { value: number }) {
  const element = useRef<HTMLSpanElement>(null),
    previous = useRef(0);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const from = previous.current;
    previous.current = value;
    let frame = 0;
    const start = performance.now();
    const finish = () => {
      cancelAnimationFrame(frame);
      node.textContent = String(value);
    };
    function update(now: number) {
      if (reduced.matches) {
        finish();
        return;
      }
      const fraction = Math.min(1, (now - start) / 650);
      if (node)
        node.textContent = String(Math.round(from + (value - from) * (1 - (1 - fraction) ** 3)));
      if (fraction < 1) frame = requestAnimationFrame(update);
    }
    if (reduced.matches) finish();
    else frame = requestAnimationFrame(update);
    reduced.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", finish);
    };
  }, [value]);
  return (
    <>
      <span ref={element} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
export function DocumentsSkeleton() {
  return (
    <div className={styles.loading} role="status" aria-label="Cargando tu lista de documentos">
      <div className={styles.summaryGrid}>
        <div className={`${styles.skeleton} ${styles.summarySkeleton}`} />
        <div className={`${styles.skeleton} ${styles.summarySkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.identitySkeleton}`} />
      <div className={styles.documentGrid}>
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className={`${styles.skeleton} ${styles.cardSkeleton}`} />
        ))}
      </div>
    </div>
  );
}
