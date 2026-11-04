"use client";
import { useEffect, useState } from "react";
import { getResumenSolicitudes } from "@/lib/api/inscripcion";
import type { ResumenSolicitudes } from "@/types/inscripcion";
import { SOLICITUD_CHANGED_EVENT } from "./useSolicitudSummary";

// Resumen del módulo (contadores de pestañas, interruptor y medidores). Misma cadencia que el
// contador del menú: al cargar, cada 30 s con la pestaña visible, al recuperar el foco y tras
// cada decisión.
export function useResumenSolicitudes() {
  const [resumen, setResumen] = useState<ResumenSolicitudes | null>(null),
    [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true,
      enCurso = false;
    function refrescar() {
      if (enCurso) return;
      enCurso = true;
      getResumenSolicitudes()
        .then((result) => {
          if (!vivo) return;
          setResumen(result);
          setFallo(false);
        })
        .catch(() => {
          if (vivo) setFallo(true);
        })
        .finally(() => {
          enCurso = false;
        });
    }
    const siVisible = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    refrescar();
    const timer = setInterval(siVisible, 30000);
    window.addEventListener("focus", siVisible);
    window.addEventListener(SOLICITUD_CHANGED_EVENT, siVisible);
    document.addEventListener("visibilitychange", siVisible);
    return () => {
      vivo = false;
      clearInterval(timer);
      window.removeEventListener("focus", siVisible);
      window.removeEventListener(SOLICITUD_CHANGED_EVENT, siVisible);
      document.removeEventListener("visibilitychange", siVisible);
    };
  }, []);
  return { resumen, fallo, setResumen };
}
