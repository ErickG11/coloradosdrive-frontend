"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  attendanceError,
  attendanceLabel,
  attendanceReasonError,
} from "@/lib/utils/practiceAttendance";
import type { PracticeSlot } from "@/types/practiceSlot";

export function AttendanceCorrectionDialog({
  current,
  next,
  endpoint,
  onClose,
  onSaved,
  title = "Confirmar cambio de asistencia",
  disabledReason,
  onWindowClosed,
  onBusyChange,
}: {
  current: boolean | null;
  next: boolean;
  endpoint: string;
  onClose: () => void;
  onSaved: (slot: PracticeSlot) => void;
  title?: string;
  disabledReason?: string;
  onWindowClosed?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reason = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const help = useId();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(saving);
    return () => onBusyChange?.(false);
  }, [saving, onBusyChange]);
  useEffect(() => {
    if (fieldError && !saving) reason.current?.focus();
  }, [fieldError, saving]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || disabledReason) return;
    const invalid = attendanceReasonError(motivo);
    setFieldError(invalid);
    if (invalid) {
      reason.current?.focus();
      return;
    }
    if (current === next) {
      setError("La corrección debe cambiar el valor actual.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await api.patch<PracticeSlot>(endpoint, {
        attended: next,
        motivo: motivo.trim(),
      });
      if (mounted.current) onSaved(result);
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof ApiError && cause.status === 400) {
        setFieldError(
          "El motivo debe tener entre 10 y 500 caracteres. Revisa el texto e inténtalo de nuevo.",
        );
        reason.current?.focus();
      } else setError(attendanceError(cause));
      if (cause instanceof ApiError && cause.code === "ATTENDANCE_WINDOW_CLOSED")
        onWindowClosed?.();
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy.current) onClose();
      }}
      title={title}
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Valor actual: {attendanceLabel(current)}. Nuevo valor: {attendanceLabel(next)}.
        </p>
        <Textarea
          ref={reason}
          label="Motivo de la corrección"
          value={motivo}
          required
          error={fieldError ?? undefined}
          aria-describedby={help}
          disabled={saving}
          onChange={(event) => {
            setMotivo(event.target.value);
            setFieldError(null);
          }}
        />
        <p id={help} className="text-xs text-text-secondary">
          Entre 10 y 500 caracteres. El motivo quedará en el historial de auditoría.
        </p>
        {disabledReason || error ? (
          <p role="alert" className="text-sm text-status-error">
            {disabledReason ?? error}
          </p>
        ) : null}
        {saving ? (
          <p role="status" className="text-sm text-text-secondary">
            Guardando asistencia…
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || Boolean(disabledReason)}>
            {saving ? "Guardando…" : "Confirmar cambio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
