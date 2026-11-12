"use client";
import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { IndividualEnrollmentAccess } from "@/types/individualEnrollmentAccess";
export function StudentEnrollmentAccess({
  studentId,
  onChanged,
}: {
  studentId: string;
  onChanged?: () => void;
}) {
  const state = useFetch<IndividualEnrollmentAccess>(
    `/admin/estudiantes/${encodeURIComponent(studentId)}/matriculas/acceso`,
  );
  const [selected, setSelected] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enrollment =
    state.data?.enrollments.find((e) => e.id === selected) ?? state.data?.enrollments[0];
  async function submit(repeat = false) {
    if (!enrollment || !reason.trim()) {
      setMessage("Escribe el motivo de la operación.");
      return;
    }
    if (!repeat && !end) {
      setMessage("Selecciona el nuevo fin del acceso.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (repeat)
        await api.post(`/admin/estudiantes/${studentId}/matriculas/repeticion`, {
          courseId: enrollment.courseId,
          motivo: reason.trim(),
        });
      else
        await api.patch(`/admin/estudiantes/${studentId}/matriculas/${enrollment.id}/acceso`, {
          fin: end,
          motivo: reason.trim(),
        });
      setMessage(
        repeat
          ? "Excepción registrada; se conserva la matrícula finalizada y se crea la nueva sin cohorte."
          : "Acceso extendido con auditoría. Las fechas de prácticas no cambian.",
      );
      state.refetch();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar la operación. Recarga antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (state.data?.active === false) return null;
  if (state.error) return <p role="status">{state.error}</p>;
  if (!enrollment)
    return state.isLoading ? <p role="status">Consultando fechas de matrículas…</p> : null;
  return (
    <fieldset className="my-4 grid gap-3 rounded-sm border p-4" disabled={busy}>
      <legend>Fechas individuales y excepciones</legend>
      <Select
        label="Matrícula"
        value={enrollment.id}
        onChange={(e) => {
          setSelected(e.target.value);
          setEnd("");
          setMessage(null);
        }}
      >
        {state.data?.enrollments.map((e) => (
          <option key={e.id} value={e.id}>
            Tipo {e.type} · {e.status} · {e.id.slice(-6)}
          </option>
        ))}
      </Select>
      <p>
        Prácticas: {enrollment.practiceStartDate ?? "Pendiente"} —{" "}
        {enrollment.practiceEndDate ?? "Pendiente"}. Acceso hasta:{" "}
        {enrollment.accessEndDate ?? "Pendiente"}.
      </p>
      {!enrollment.guardReady ? (
        <p role="status">
          Histórico pendiente de evidencia: el nuevo guard de fechas no se activa para esta
          matrícula.
        </p>
      ) : null}
      <Input
        label="Motivo de la extensión o excepción"
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {enrollment.guardReady && ["activo", "finalizado"].includes(enrollment.status) ? (
        <>
          <Input
            label="Nuevo fin del acceso"
            type="date"
            min={enrollment.accessEndDate ?? undefined}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Button type="button" onClick={() => void submit()}>
            Extender acceso
          </Button>
        </>
      ) : null}
      {enrollment.status === "finalizado" ? (
        <Button type="button" variant="secondary" onClick={() => void submit(true)}>
          Autorizar repetición con excepción
        </Button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </fieldset>
  );
}
