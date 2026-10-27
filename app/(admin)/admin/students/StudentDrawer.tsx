"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StudentDetail } from "./StudentDetail";
import { StudentIcon } from "./StudentVisual";
import styles from "./students.module.css";

export function StudentDrawer({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const close = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    close.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);
  useEffect(() => {
    if (!id) return;
    const query = window.matchMedia("(max-width: 1099px)");
    const previousOverflow = document.body.style.overflow;
    let scroll = window.scrollY;
    function lock() {
      if (query.matches) {
        scroll = window.scrollY;
        window.scrollTo(0, 0);
        document.body.style.overflow = "hidden";
      } else document.body.style.overflow = previousOverflow;
    }
    lock();
    query.addEventListener("change", lock);
    return () => {
      query.removeEventListener("change", lock);
      document.body.style.overflow = previousOverflow;
      if (query.matches) window.scrollTo(0, scroll);
    };
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus({ preventScroll: true });
    function key(event: KeyboardEvent) {
      // Existing edit/confirmation modals own their keyboard and focus while open.
      if (panel.current?.querySelector('[aria-modal="true"]')) return;
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab" || !window.matchMedia("(max-width: 1099px)").matches) return;
      const items = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ) ?? [],
      ).filter((item) => item.getClientRects().length > 0);
      const first = items[0],
        last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [id]);
  return (
    <AnimatePresence>
      {id && (
        <motion.aside
          ref={panel}
          key="student-drawer"
          className={styles.drawer}
          role="region"
          aria-label="Ficha del alumno"
          tabIndex={-1}
          initial={reduced ? false : { opacity: 0, transform: "translateX(24px)" }}
          animate={{ opacity: 1, transform: "translateX(0)", transitionEnd: { transform: "none" } }}
          exit={{ opacity: 0, transform: reduced ? "none" : "translateX(16px)" }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className={styles.drawerBar}>
            <span>Ficha del alumno</span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Cerrar ficha del alumno"
              disabled={busy}
              onClick={onClose}
            >
              <StudentIcon name="close" />
            </button>
          </div>
          <StudentDetail key={id} id={id} embedded onChanged={onChanged} onBusyChange={setBusy} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
