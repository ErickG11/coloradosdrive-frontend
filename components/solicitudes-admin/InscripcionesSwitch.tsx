"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Modal } from "@/components/ui/Modal";
import { setConfigInscripciones } from "@/lib/api/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import { SOLICITUD_CHANGED_EVENT } from "./useSolicitudSummary";
import styles from "./solicitudes.module.css";

// Interruptor «Inscripciones abiertas». Cambiarlo pide confirmación porque cerrar corta la
// entrada de nuevas solicitudes y abrir la reactiva para todo el público.
export function InscripcionesSwitch({
  abiertas,
  onChanged,
}: {
  abiertas: boolean | null;
  onChanged: (abiertas: boolean) => void;
}) {
  const [confirmando, setConfirmando] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState("");
  const lock = useRef(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const siguiente = abiertas === null ? null : !abiertas;

  function cerrarConfirmacion() {
    setConfirmando(false);
    setError("");
    requestAnimationFrame(() => disparador.current?.focus());
  }

  async function confirmar() {
    if (siguiente === null || lock.current) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    try {
      const result = await setConfigInscripciones(siguiente);
      onChanged(result.inscripcionesAbiertas);
      setAviso(
        result.inscripcionesAbiertas
          ? "Las inscripciones quedaron abiertas."
          : "Las inscripciones quedaron cerradas.",
      );
      setConfirmando(false);
      window.dispatchEvent(new Event(SOLICITUD_CHANGED_EVENT));
      requestAnimationFrame(() => disparador.current?.focus());
    } catch (e) {
      setError(adminErrorMessage(e));
    } finally {
      lock.current = false;
      setOcupado(false);
    }
  }

  return (
    <div className={styles.switchBox}>
      <span id="switch-inscripciones-label" className={styles.switchLabel}>
        Inscripciones abiertas
      </span>
      <button
        ref={disparador}
        type="button"
        role="switch"
        aria-checked={abiertas ?? false}
        aria-labelledby="switch-inscripciones-label"
        disabled={abiertas === null}
        className={styles.switchButton}
        data-on={abiertas === true}
        onClick={() => setConfirmando(true)}
      >
        <span className={styles.switchThumb} aria-hidden="true" />
        <span className="sr-only">{abiertas ? "Activado" : "Desactivado"}</span>
      </button>
      <span className={styles.switchState} aria-hidden="true">
        {abiertas === null ? "…" : abiertas ? "Sí" : "No"}
      </span>
      <p role="status" className="sr-only">
        {aviso}
      </p>
      <Modal
        isOpen={confirmando}
        onClose={ocupado ? () => undefined : cerrarConfirmacion}
        title={siguiente ? "¿Abrir las inscripciones?" : "¿Cerrar las inscripciones?"}
      >
        <div className={styles.detail}>
          <p>
            {siguiente
              ? "El público podrá volver a enviar solicitudes de inscripción en línea."
              : "Nadie podrá iniciar una solicitud nueva y se mostrará el contacto por WhatsApp. Las solicitudes en curso se siguen revisando."}
          </p>
          <FormError>{error}</FormError>
          <div className={styles.controls}>
            <Button isLoading={ocupado} onClick={() => void confirmar()}>
              {siguiente ? "Sí, abrir inscripciones" : "Sí, cerrar inscripciones"}
            </Button>
            <Button variant="ghost" disabled={ocupado} onClick={cerrarConfirmacion}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
