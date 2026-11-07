"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { PrivacyNotice, SolicitudSession } from "@/types/solicitud";
import styles from "./inscripcion.module.css";
export function ConsentStep({
  session,
  onAccepted,
}: {
  session: SolicitudSession;
  onAccepted: () => void;
}) {
  const [notice, setNotice] = useState<PrivacyNotice | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [treatment, setTreatment] = useState(false),
    [truth, setTruth] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    solicitudes
      .notice()
      .then((n) => {
        if (alive) setNotice(n);
      })
      .catch((e) => {
        if (alive) setError(solicitudMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (!notice || !treatment || !truth || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await solicitudes.consent(session, notice.version);
      onAccepted();
    } catch (e) {
      setError(solicitudMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={accept} className={styles.form}>
      <FormError>{error}</FormError>
      {notice ? (
        <>
          <p>
            Usaremos tus datos para revisar tu solicitud y gestionar tu matrícula si se aprueba.
            Solo el personal autorizado revisará tus documentos.
          </p>
          <p className="text-status-warning">
            Aviso en borrador, pendiente de revisión legal. Versión {notice.version}.
          </p>
          <p>
            Retención de solicitudes: {notice.retencionDias} días; pendientes sin documentos: 7
            días. Derechos: {notice.contactoDerechos}.
          </p>
          <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
            Leer el aviso de privacidad completo (abre otra pestaña)
          </Link>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={treatment}
              onChange={(e) => setTreatment(e.target.checked)}
            />
            Leí el aviso y autorizo el tratamiento de mis datos.
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={truth} onChange={(e) => setTruth(e.target.checked)} />
            Declaro que los datos y documentos son verdaderos y autorizo su revisión.
          </label>
          <div className={styles.stepActions}>
            <Button type="submit" disabled={!treatment || !truth} isLoading={busy}>
              Continuar a datos personales
            </Button>
          </div>
        </>
      ) : error ? (
        <Button
          type="button"
          onClick={() => {
            setError("");
            setRetry(retry + 1);
          }}
        >
          Reintentar
        </Button>
      ) : (
        <p role="status">Cargando aviso…</p>
      )}
    </form>
  );
}
