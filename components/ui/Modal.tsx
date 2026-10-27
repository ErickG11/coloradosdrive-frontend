"use client";

import { useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { XIcon } from "./icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  useDialogFocus(isOpen, panel, onClose);
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div aria-hidden="true" onPointerDown={onClose} className="fixed inset-0 bg-black/50" />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Diálogo"}
            tabIndex={-1}
            className={cn(
              "relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg border border-border bg-bg-surface p-5 shadow-elevated md:p-6",
              className,
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              {title ? (
                <h2
                  id={titleId}
                  className="pt-2 text-balance text-lg font-semibold tracking-tight text-text-primary"
                >
                  {title}
                </h2>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
