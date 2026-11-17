"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";

import { CheckIcon, XIcon } from "./icons";

// Aviso verde de éxito de TODA la aplicación: un solo componente y una sola API
// (ToastProvider + useToast). Se descarta solo, no bloquea la pantalla ni roba el foco.
export const TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 3;

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

export interface ToastAction {
  href: string;
  label: string;
}

export interface ToastApi {
  success: (message: string, options?: { action?: ToastAction }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Sin proveedor (una pantalla aislada en una prueba) el aviso se ignora en silencio.
const NOOP_TOAST: ToastApi = { success: () => undefined };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const remaining = useRef(TOAST_DURATION_MS);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const hovered = useRef(false);
  const focused = useRef(false);

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
      data-testid="toast"
      onMouseEnter={() => {
        hovered.current = true;
        pause();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        if (!focused.current) resume();
      }}
      onFocus={() => {
        focused.current = true;
        pause();
      }}
      onBlur={(event) => {
        // Mover el foco entre hijos de la tarjeta no cuenta como salir.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        focused.current = false;
        if (!hovered.current) resume();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="toast-enter pointer-events-auto flex items-start gap-3 rounded-md border border-status-success bg-status-success-bg px-4 py-3 text-sm text-status-success shadow-elevated"
    >
      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{item.message}</p>
      {item.action ? (
        <Link
          href={item.action.href}
          className="shrink-0 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {item.action.label}
        </Link>
      ) : null}
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={onClose}
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Vive en el layout raíz: un aviso disparado justo antes de un router.push sobrevive a la
// navegación. La región viva está siempre montada; solo cambian sus hijos.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, options?: { action?: ToastAction }) => {
    const id = nextId.current++;
    setToasts((current) =>
      [...current, { id, message, action: options?.action }].slice(-MAX_VISIBLE_TOASTS),
    );
  }, []);

  const api = useMemo<ToastApi>(() => ({ success }), [success]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
