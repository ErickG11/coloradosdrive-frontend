"use client";
import { useEffect, useRef, useState } from "react";
import { getResumenSolicitudes } from "@/lib/api/inscripcion";

export const SOLICITUD_CHANGED_EVENT = "solicitudes-actualizadas";

// Contador del menú del admin: consulta al cargar, cada 30 s con la pestaña visible, al
// recuperar el foco y tras cada decisión. `notice` sube cuando aumentan las pendientes (nunca en
// la carga inicial) y alimenta el aviso verde no bloqueante.
export function useSolicitudSummary(enabled: boolean) {
  const [pending, setPending] = useState(0),
    [notice, setNotice] = useState(0),
    previous = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    previous.current = null;
    let alive = true,
      inflight = false;
    async function refresh() {
      if (inflight) return;
      inflight = true;
      try {
        const result = await getResumenSolicitudes();
        if (!alive) return;
        if (previous.current !== null && result.pendientes > previous.current)
          setNotice((n) => n + 1);
        previous.current = result.pendientes;
        setPending(result.pendientes);
      } catch {
        /* El contador no bloquea la navegación. */
      } finally {
        inflight = false;
      }
    }
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const timer = setInterval(visibleRefresh, 30000);
    window.addEventListener("focus", visibleRefresh);
    window.addEventListener(SOLICITUD_CHANGED_EVENT, visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      window.removeEventListener(SOLICITUD_CHANGED_EVENT, visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [enabled]);
  return { pending, notice, dismiss: () => setNotice(0) };
}
