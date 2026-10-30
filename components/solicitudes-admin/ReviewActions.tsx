"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { FormError } from "@/components/ui/FormError";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { SolicitudDecision } from "@/types/solicitud";
import styles from "./solicitudes.module.css";
export function ReviewActions({
  id,
  documentoId,
  onDone,
}: {
  id: string;
  documentoId?: string;
  onDone: (message: string, decision?: SolicitudDecision) => void;
}) {
  const [choice, setChoice] = useState<"approve" | "reject" | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const subject = documentoId ? "documento" : "solicitud";
  async function confirm() {
    if (!choice || lock.current) return;
    if (choice === "reject" && !reason.trim()) {
      setError("Indica el motivo del rechazo.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (documentoId) {
        await solicitudes.reviewDocument(
          id,
          documentoId,
          choice === "approve" ? "aprobado" : "rechazado",
          choice === "reject" ? reason.trim() : undefined,
        );
        onDone(choice === "approve" ? "Documento aprobado." : "Documento rechazado.");
      } else {
        const result = await solicitudes.decide(
          id,
          choice === "approve" ? "aprobada" : "rechazada",
          choice === "reject" ? reason.trim() : undefined,
        );
        onDone(choice === "approve" ? "Solicitud aprobada." : "Solicitud rechazada.", result);
      }
      setChoice(null);
      setReason("");
    } catch (e) {
      setError(solicitudMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.detail}>
      {choice ? (
        <div className={styles.detail} role="group" aria-label={`Confirmar revisión de ${subject}`}>
          <p>
            {choice === "approve"
              ? `Confirma que deseas aprobar este ${subject === "solicitud" ? "expediente" : "documento"}.`
              : `Indica por qué rechazas este ${subject === "solicitud" ? "expediente" : "documento"}.`}
          </p>
          {choice === "reject" ? (
            <Textarea
              autoFocus
              label="Motivo del rechazo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={error || undefined}
              required
            />
          ) : (
            <FormError>{error}</FormError>
          )}
          <div className={styles.controls}>
            <Button
              autoFocus={choice === "approve"}
              isLoading={busy}
              onClick={() => void confirm()}
            >
              {choice === "approve" ? "Confirmar aprobación" : "Confirmar rechazo"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setChoice(null);
                setError("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.controls}>
          <Button onClick={() => setChoice("approve")}>Aprobar {subject}</Button>
          <Button variant="danger" onClick={() => setChoice("reject")}>
            Rechazar {subject}
          </Button>
        </div>
      )}
    </div>
  );
}
