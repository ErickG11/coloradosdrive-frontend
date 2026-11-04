"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { confirmStudentIdentity, studentIdentityError } from "@/lib/api/studentIdentity";

export function StudentIdentityConfirmation({
  studentId,
  onClose,
  onSaved,
  onReload,
}: {
  studentId: string;
  onClose: () => void;
  onSaved: () => void;
  onReload: () => void;
}) {
  const reasonId = useId();
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [failure, setFailure] = useState<ReturnType<typeof studentIdentityError> | null>(null);
  // Misma normalización y longitud por puntos de código que el servidor.
  const normalized = motivo
    .replace(/\s+/gu, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .normalize("NFC")
    .trim();
  const length = Array.from(normalized).length;
  const valid = length >= 10 && length <= 300;

  function close() {
    if (!submitting.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !valid || failure?.reload) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await confirmStudentIdentity(studentId, normalized);
      onSaved();
    } catch (error) {
      setFailure(studentIdentityError(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal isOpen title="Confirmar identidad manualmente" onClose={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Confirma que revisaste la identidad presencialmente. Esta acción se permite después del
          plazo del instructor y queda auditada con tu usuario y el motivo.
        </p>
        <Input
          id={reasonId}
          name="motivo"
          label="Motivo (10 a 300 caracteres)"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          required
          maxLength={1200}
          disabled={busy || failure?.reload}
          aria-describedby={`${reasonId}-ayuda ${reasonId}-contador`}
        />
        <p id={`${reasonId}-ayuda`} className="text-sm text-text-secondary">
          Explica la razón operativa sin incluir datos personales.
        </p>
        <p id={`${reasonId}-contador`} className="text-sm text-text-secondary" aria-live="polite">
          {length}/300 caracteres
        </p>
        {failure ? (
          <p role="alert" className="text-sm text-accent-red">
            {failure.message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={close}>
            Cancelar
          </Button>
          {failure?.reload ? (
            <Button type="button" onClick={onReload} disabled={busy}>
              Recargar ficha
            </Button>
          ) : (
            <Button type="submit" disabled={busy || !valid}>
              {busy ? "Guardando…" : "Confirmar identidad"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
