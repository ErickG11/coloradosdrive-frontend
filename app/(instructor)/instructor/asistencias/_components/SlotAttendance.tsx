"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { useAttendanceCorrectionWindow } from "@/hooks/useAttendanceCorrectionWindow";
import { api } from "@/lib/api/client";
import {
  attendanceError,
  attendanceLabel,
  correctionWindowMessage,
} from "@/lib/utils/practiceAttendance";
import type { PracticeSlot, PracticeSlotWithNames } from "@/types";
import styles from "../attendance.module.css";

export function SlotAttendance({
  slot,
  onSaved,
  submit,
  compact = false,
  disabled = false,
}: {
  slot: PracticeSlotWithNames;
  onSaved: (slot: PracticeSlot) => void;
  submit?: (slot: PracticeSlotWithNames, attended: boolean, motivo?: string) => Promise<void>;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingCorrection, setPendingCorrection] = useState<boolean | null>(null);
  const [windowDenied, setWindowDenied] = useState(false);
  const canCorrect =
    useAttendanceCorrectionWindow(slot.scheduledAt, slot.durationMinutes) && !windowDenied;
  const changeButton = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (saved) changeButton.current?.focus();
  }, [saved]);

  function didSave(updated: PracticeSlot) {
    onSaved(updated);
    setEditing(false);
    setPendingCorrection(null);
    setSaved(true);
  }
  async function save(attended: boolean) {
    if (busy.current || disabled) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (submit) {
        await submit(slot, attended);
        return;
      }
      const updated = await api.patch<PracticeSlot>(`/practice-slots/${slot.id}/attendance`, {
        attended,
      });
      if (mounted.current) didSave(updated);
    } catch (cause) {
      if (mounted.current) setError(attendanceError(cause));
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  function choose(attended: boolean) {
    if (slot.attended !== null) {
      if (slot.attended === attended) setEditing(false);
      else if (canCorrect) setPendingCorrection(attended);
    } else void save(attended);
  }
  return (
    <div className="flex flex-col gap-2">
      {!compact || saved ? (
        <p role={saved ? "status" : undefined} className="text-sm text-text-secondary">
          {saved ? "Asistencia guardada: " : "Asistencia: "}
          {attendanceLabel(slot.attended)}
        </p>
      ) : null}
      {slot.attended === null || (editing && canCorrect) || (compact && canCorrect) ? (
        <div className={compact ? styles.segmented : "flex flex-wrap gap-2"}>
          <Button
            size="sm"
            variant={compact ? "ghost" : "primary"}
            aria-pressed={compact ? slot.attended === true : undefined}
            disabled={saving || disabled}
            onClick={() => choose(true)}
          >
            Asistió
          </Button>
          <Button
            size="sm"
            variant={compact ? "ghost" : "secondary"}
            aria-pressed={compact ? slot.attended === false : undefined}
            disabled={saving || disabled}
            onClick={() => choose(false)}
          >
            No asistió
          </Button>
          {editing ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : canCorrect ? (
        <Button
          ref={changeButton}
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            setEditing(true);
            setSaved(false);
          }}
        >
          Cambiar asistencia
        </Button>
      ) : (
        <p className="text-sm text-text-secondary">{correctionWindowMessage}</p>
      )}
      {saving ? (
        <p role="status" className="text-sm text-text-secondary">
          Guardando asistencia…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-status-error">
          {error}
        </p>
      ) : null}
      {pendingCorrection !== null ? (
        <AttendanceCorrectionDialog
          current={slot.attended}
          next={pendingCorrection}
          endpoint={`/practice-slots/${slot.id}/attendance`}
          onSaved={didSave}
          save={submit ? ({ attended, motivo }) => submit(slot, attended, motivo) : undefined}
          onClose={() => setPendingCorrection(null)}
          onWindowClosed={() => setWindowDenied(true)}
          disabledReason={canCorrect ? undefined : correctionWindowMessage}
        />
      ) : null}
    </div>
  );
}
