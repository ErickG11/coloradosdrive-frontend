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

export function SlotAttendance({
  slot,
  onSaved,
}: {
  slot: PracticeSlotWithNames;
  onSaved: (slot: PracticeSlot) => void;
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
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
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
      <p role={saved ? "status" : undefined} className="text-sm text-text-secondary">
        {saved ? "Asistencia guardada: " : "Asistencia: "}
        {attendanceLabel(slot.attended)}
      </p>
      {slot.attended === null || (editing && canCorrect) ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving} onClick={() => choose(true)}>
            Asistió
          </Button>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => choose(false)}>
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
          onClose={() => setPendingCorrection(null)}
          onWindowClosed={() => setWindowDenied(true)}
          disabledReason={canCorrect ? undefined : correctionWindowMessage}
        />
      ) : null}
    </div>
  );
}
