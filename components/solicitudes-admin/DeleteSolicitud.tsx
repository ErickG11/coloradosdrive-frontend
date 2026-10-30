"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/ui/FormError";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import styles from "./solicitudes.module.css";
export function DeleteSolicitud({
  id,
  cedula,
  onDeleted,
}: {
  id: string;
  cedula: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false),
    [typed, setTyped] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function remove() {
    if (typed.trim() !== cedula || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await solicitudes.remove(id);
      onDeleted();
    } catch (e) {
      setError(solicitudMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return confirming ? (
    <div className={styles.detail} role="group" aria-label="Confirmar eliminación de solicitud">
      <p>Se eliminarán los datos y archivos de esta solicitud. Esta acción no se puede deshacer.</p>
      <Input
        autoFocus
        label="Escribe la cédula para confirmar"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        error={typed && typed.trim() !== cedula ? "La cédula no coincide." : undefined}
      />
      <FormError>{error}</FormError>
      <div className={styles.controls}>
        <Button
          variant="danger"
          disabled={typed.trim() !== cedula}
          isLoading={busy}
          onClick={() => void remove()}
        >
          Eliminar definitivamente
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError("");
          }}
        >
          Cancelar eliminación
        </Button>
      </div>
    </div>
  ) : (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Eliminar solicitud
    </Button>
  );
}
