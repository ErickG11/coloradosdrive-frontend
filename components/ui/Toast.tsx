"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { CheckIcon, XIcon } from "./icons";

export const TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 3;

interface ToastItem {
  id: number;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Sin proveedor (p. ej. una pantalla aislada en una prueba) el aviso se
// ignora en silencio: los tres paneles montan el proveedor en su layout.
const NOOP_TOAST: ToastApi = { success: () => undefined };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

function ToastCard({ message, onClose }: { message: string; onClose: () => void }) {
  const remaining = useRef(TOAST_DURATION_MS);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const resume = useCallback(() => {
    if (timer.current !== null) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onCloseRef.current(), remaining.current);
  }, []);

  const pause = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
  }, []);

  useEffect(() => {
    resume();
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [resume]);

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="toast-enter pointer-events-auto flex items-start gap-3 rounded-md border border-success-border bg-success-bg px-4 py-3 text-sm text-success-text shadow-elevated"
    >
      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 break-words">{message}</p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={onClose}
        className="-m-1 shrink-0 rounded-sm p-1 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Vive en el layout de cada panel: un toast disparado justo antes de un
// router.push sobrevive a la navegación porque el layout no se desmonta.
// La región viva está siempre montada; solo cambian sus hijos.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }].slice(-MAX_VISIBLE_TOASTS));
  }, []);

  const api = useMemo<ToastApi>(() => ({ success }), [success]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} message={toast.message} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
