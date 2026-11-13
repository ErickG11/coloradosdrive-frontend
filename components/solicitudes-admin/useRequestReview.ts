"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { RequestReviewState } from "@/types/requestReview";

// Candado de revisión gestionado en silencio: se adquiere al abrir la solicitud y se renueva
// mientras el panel sigue abierto. El servidor no ofrece una operación de liberación: al cerrar
// el panel se deja de renovar y el candado vence solo.
export interface RequestReviewLock {
  phase: "inactive" | "loading" | "owned" | "other" | "error";
  token: string | null;
  until: string | null;
}

const INACTIVE: RequestReviewLock = { phase: "inactive", token: null, until: null };
const MIN_RENEW_MS = 15_000;
const MAX_RENEW_MS = 120_000;

export function useRequestReview(id: string, enabled: boolean): RequestReviewLock {
  const [lock, setLock] = useState<RequestReviewLock>(INACTIVE);

  useEffect(() => {
    if (!enabled) {
      setLock(INACTIVE);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const root = `/admin/solicitudes/${id}/revision`;

    function apply(state: RequestReviewState) {
      if (!alive) return;
      if (state.active === false) return setLock(INACTIVE);
      if (state.owned && state.token) {
        setLock({ phase: "owned", token: state.token, until: state.until ?? null });
        const left =
          state.until && state.serverNow
            ? new Date(state.until).getTime() - new Date(state.serverNow).getTime()
            : 4 * MIN_RENEW_MS;
        timer = setTimeout(
          () => void claim(),
          Math.min(MAX_RENEW_MS, Math.max(MIN_RENEW_MS, left / 2)),
        );
        return;
      }
      setLock({ phase: "other", token: null, until: state.until ?? null });
    }

    async function claim() {
      try {
        apply(await api.post<RequestReviewState>(`${root}/reclamar`, {}));
      } catch (error) {
        if (!alive) return;
        // Ocupada por otro revisor: se consulta su vencimiento y el panel queda en solo lectura.
        if (error instanceof ApiError && error.code === "SOLICITUD_REVISION_OCUPADA") {
          try {
            apply(await api.get<RequestReviewState>(root));
          } catch {
            setLock({ phase: "other", token: null, until: null });
          }
          return;
        }
        setLock({ phase: "error", token: null, until: null });
      }
    }

    async function start() {
      setLock({ phase: "loading", token: null, until: null });
      try {
        const state = await api.get<RequestReviewState>(root);
        if (!alive) return;
        const busy =
          state.active !== false &&
          !state.owned &&
          state.until &&
          state.serverNow &&
          new Date(state.until).getTime() > new Date(state.serverNow).getTime();
        if (state.active === false || busy) apply(state);
        else await claim();
      } catch {
        if (alive) setLock({ phase: "error", token: null, until: null });
      }
    }

    void start();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, enabled]);

  return lock;
}

export function horaGuayaquil(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });
}
