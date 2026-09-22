"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { XIcon } from "./icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Overlay + panel centrado con el mismo patrón AnimatePresence que ya usa
// el drawer móvil del Sidebar - no se agrega ninguna librería de diálogos
// nueva. Cierra con Escape o con clic en el overlay; no atrapa el foco
// dentro del panel (fuera de alcance para lo que se necesita hasta ahora).
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/40"
          />
          <motion.div
            key="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-bg-surface p-6 shadow-elevated backdrop-blur-md md:p-8",
              className,
            )}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              {title ? (
                <h2 className="font-display text-xl font-bold tracking-tight text-text-primary">
                  {title}
                </h2>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="ml-auto shrink-0 rounded-sm p-1.5 text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
