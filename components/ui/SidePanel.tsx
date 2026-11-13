"use client";
import { useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils/cn";
import { XIcon } from "./icons";

const subscribeToMount = () => () => {};

export function SidePanel({
  title,
  subtitle,
  avatar,
  header,
  actions,
  footer,
  children,
  onClose,
  closeDisabled = false,
  bodyClassName,
  className,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  avatar?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  bodyClassName?: string;
  className?: string;
  id?: string;
}) {
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
  const panel = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(mounted, panel, () => {
    if (!closeDisabled) onClose();
  });
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onPointerDown={() => {
          if (!closeDisabled) onClose();
        }}
      />
      <aside
        id={id}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex h-dvh w-full max-w-[560px] flex-col border-l border-border bg-bg-surface text-text-primary shadow-elevated outline-none",
          className,
        )}
      >
        <header className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            {avatar}
            <div className="min-w-0 flex-1 break-words">
              <h2 id={titleId} className="font-display text-xl font-semibold leading-snug">
                {title}
              </h2>
              {subtitle ? <div className="mt-1 text-sm text-text-secondary">{subtitle}</div> : null}
              {header ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">{header}</div>
              ) : null}
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
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer className="max-h-[55dvh] shrink-0 overflow-y-auto border-t border-border bg-bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
