"use client";
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/ui/FormError";
import { eliminarSolicitud } from "@/lib/api/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import styles from "./solicitudes.module.css";

// Eliminación definitiva de una solicitud no aprobada (borra archivo y filas en el servidor).
// Se confirma tecleando la cédula; si no tiene cédula guardada se confirma con la palabra
// ELIMINAR.
export function DeleteSolicitud({
  id,
  cedula,
  onDeleted,
}: {
  id: string;
  cedula: string | null;
  onDeleted: () => void;
}) {
  const clave = cedula ?? "ELIMINAR";
  const [confirmando, setConfirmando] = useState(false),
    [escrito, setEscrito] = useState(""),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const lock = useRef(false);
  async function eliminar() {
    if (escrito.trim() !== clave || lock.current) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    try {
      await eliminarSolicitud(id);
      onDeleted();
    } catch (e) {
      setError(adminErrorMessage(e));
    } finally {
      lock.current = false;
      setOcupado(false);
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start !text-status-error"
        onClick={() => setConfirmando(true)}
      >
        Eliminar solicitud
      </Button>
      <Modal
        isOpen={confirmando}
        onClose={() => {
          if (!ocupado) {
            setConfirmando(false);
            setEscrito("");
            setError("");
          }
        }}
        title="Eliminar solicitud"
      >
        <div className={styles.detail} role="group" aria-label="Confirmar eliminación de solicitud">
          <p>
            Se eliminarán los datos y el archivo de esta solicitud. Esta acción no se puede
            deshacer.
          </p>
          <Input
            autoFocus
            label={cedula ? "Escribe la cédula para confirmar" : "Escribe ELIMINAR para confirmar"}
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            inputMode={cedula ? "numeric" : "text"}
            autoComplete="off"
            error={escrito && escrito.trim() !== clave ? "No coincide." : undefined}
          />
          <FormError>{error}</FormError>
          <div className={styles.controls}>
            <Button
              variant="danger"
              disabled={escrito.trim() !== clave}
              isLoading={ocupado}
              onClick={() => void eliminar()}
            >
              Eliminar definitivamente
            </Button>
            <Button
              variant="ghost"
              disabled={ocupado}
              onClick={() => {
                setConfirmando(false);
                setEscrito("");
                setError("");
              }}
            >
              Cancelar eliminación
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
