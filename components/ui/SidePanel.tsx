"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { XIcon } from "./icons";

import styles from "./side-panel.module.css";

export function SidePanel({
  title,
  context,
  subtitle,
  avatar,
  header,
  actions,
  footer,
  children,
  onClose,
  closeDisabled = false,
  headerScrolls = false,
  bodyClassName,
  className,
  id,
}: {
  title: ReactNode;
  context?: string;
  subtitle?: ReactNode;
  avatar?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  /** La cabecera se desplaza junto con el contenido (vistas sin barra de acciones). */
  headerScrolls?: boolean;
  bodyClassName?: string;
  className?: string;
  id?: string;
}) {
  const panel = useRef<HTMLElement>(null);
  const titleId = useId();
  const close = useRef(onClose),
    disabled = useRef(closeDisabled);
  useEffect(() => {
    close.current = onClose;
    disabled.current = closeDisabled;
  }, [onClose, closeDisabled]);
  // Altura = lo visible: descuenta lo que aún separa al panel del borde superior de la ventana.
  useEffect(() => {
    const element = panel.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const gap = Math.min(
        Math.max(0, parent.getBoundingClientRect().top),
        window.innerHeight * 0.6,
      );
      element.style.setProperty("--panel-top", `${Math.round(gap)}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus({ preventScroll: true });
    function key(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        document.querySelector('[aria-modal="true"]') ||
        disabled.current
      )
        return;
      event.preventDefault();
      close.current();
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const headerNode = (
    <header className="shrink-0 border-b border-border bg-bg-surface px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        {avatar}
        <div className="min-w-0 flex-1 break-words">
          {context ? (
            <p className="mb-2 text-xs font-semibold tracking-wide text-text-secondary">
              {context}
            </p>
          ) : null}
          <h2 id={titleId} className="font-display text-xl font-semibold leading-snug">
            {title}
          </h2>
          {subtitle ? <div className="mt-1 text-sm text-text-secondary">{subtitle}</div> : null}
          {header ? <div className="mt-3 flex flex-wrap items-center gap-2">{header}</div> : null}
        </div>
        <button
          type="button"
          aria-label="Cerrar panel"
          title="Cerrar"
          disabled={closeDisabled}
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-bg-sunken disabled:opacity-50"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </header>
  );
  return (
    <aside
      id={id}
      ref={panel}
      role="complementary"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        styles.panel,
        "!min-h-0 border-l border-border bg-bg-surface text-text-primary outline-none",
        className,
      )}
    >
      {headerScrolls ? null : headerNode}
      {headerScrolls ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {headerNode}
          <div className={cn("px-5 py-6 sm:px-6", bodyClassName)}>{children}</div>
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
      )}
      {footer ? (
        <footer className="max-h-[55dvh] shrink-0 overflow-y-auto border-t border-border bg-bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {footer}
        </footer>
      ) : null}
    </aside>
  );
}
