"use client";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { XIcon } from "@/components/ui/icons";
import styles from "./solicitudes.module.css";

export function SolicitudDrawer({
  title,
  avatar,
  header,
  children,
  onClose,
}: {
  title: string;
  avatar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null),
    titleId = useId();
  useDialogFocus(true, panel, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.drawerLayer}>
      <div
        className={styles.scrim}
        data-testid="solicitud-scrim"
        aria-hidden="true"
        onPointerDown={onClose}
      />
      <aside
        id="solicitud-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.drawer}
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
      </aside>
    </div>,
    document.body,
  );
}
