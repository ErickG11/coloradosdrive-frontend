"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";
import styles from "./solicitudes.module.css";

export function SolicitudDrawer({
  title,
  avatar,
  header,
  children,
  footer,
  onClose,
}: {
  title: string;
  avatar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null),
    titleId = useId();
  useEffect(() => {
    panel.current?.focus();
    panel.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <aside
      id="solicitud-panel"
      ref={panel}
      role="region"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={styles.drawer}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.drawerHeader}>
        {avatar}
        <div className={styles.drawerTitle}>
          <span className={styles.eyebrow}>Revisión de inscripción</span>
          <h2 id={titleId}>{title}</h2>
          {header}
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar solicitud"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </header>
      <div className={styles.drawerBody}>{children}</div>
      {footer ? <footer className={styles.drawerFooter}>{footer}</footer> : null}
    </aside>
  );
}
