"use client";
import { useState, type FormEvent } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import {
  buildStudentPatch,
  profileLimits,
  studentDraft,
  studentEditError,
  studentFieldLabels,
  validateStudentPatch,
  type ProfileField,
  type StudentSaveResult,
} from "@/lib/api/studentProfile";
import type { StudentDetail } from "@/types";

export function StudentEditForm({
  student,
  onSaved,
  onCancel,
  onReload,
  onBusyChange,
  onDeletionPending,
}: {
  student: StudentDetail;
  onSaved: () => void;
  onCancel: () => void;
  onReload: () => void;
  onBusyChange: (busy: boolean) => void;
  onDeletionPending?: () => void;
}) {
  const [draft, setDraft] = useState(() => studentDraft(student));
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = buildStudentPatch(student, draft);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || reload) return;
    setMessage(null);
    setErrors({});
    const payload = buildStudentPatch(student, draft);
    if (!payload) {
      setMessage("No hay cambios para guardar.");
      return;
    }
    const invalid = validateStudentPatch(payload);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    onBusyChange(true);
    try {
      await api.patch<StudentSaveResult>(`/admin/estudiantes/${student.id}`, payload);
      onSaved();
    } catch (error) {
      const result = studentEditError(error);
      if (result.deletionPending) onDeletionPending?.();
      if (result.field) setErrors({ [result.field]: result.message });
      else setMessage(result.message);
      setReload(Boolean(result.reload));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {(Object.keys(studentFieldLabels) as ProfileField[]).map((field) => {
        const props = {
          name: `edit-${field}`,
          label: studentFieldLabels[field],
          value: draft[field],
          error: errors[field],
          maxLength: profileLimits[field],
          disabled: busy || reload || (field === "correo" && !student.correoDisponible),
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setDraft((current) => ({ ...current, [field]: event.target.value }));
            setErrors((current) => ({ ...current, [field]: undefined }));
          },
        };
        return field === "direccion" ? (
          <Textarea key={field} {...props} />
        ) : (
          <Input
            key={field}
            {...props}
            type={
              field === "fechaNacimiento"
                ? "date"
                : field === "correo"
                  ? "email"
                  : field === "telefono"
                    ? "tel"
                    : "text"
            }
            required={["cedula", "nombreCompleto", "correo"].includes(field)}
            inputMode={field === "cedula" ? "numeric" : undefined}
          />
        );
      })}
      {!student.correoDisponible && (
        <p className="text-sm text-text-secondary">
          Correo no disponible. Recarga la ficha para poder editarlo.
        </p>
      )}
      {patch?.cedula !== undefined && (
        <p role="note" className="text-sm text-text-secondary">
          La cédula identifica al alumno en todo el sistema.
        </p>
      )}
      {patch?.correo !== undefined && (
        <p role="note" className="text-sm text-text-secondary">
          El correo es con el que inicia sesión; el alumno deberá usar el nuevo.
        </p>
      )}
      {message && (
        <p role="alert" className="text-sm text-accent-red">
          {message}
        </p>
      )}
      {reload && (
        <div className="flex flex-col gap-2 text-sm text-text-secondary">
          <p>
            No vuelvas a guardar automáticamente. Recarga y compara los datos y el correo. Si no
            coinciden con lo esperado, solicita revisión administrativa.
          </p>
          <Button type="button" variant="secondary" onClick={onReload}>
            Recargar ficha
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!patch || reload} isLoading={busy}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
