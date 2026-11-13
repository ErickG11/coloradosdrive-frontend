"use client";
import { useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { IndividualEnrollmentAccess } from "@/types/individualEnrollmentAccess";

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
// Nunca se muestran códigos internos: un mensaje que sea solo un código se reemplaza.
const friendly = (error: unknown, fallback: string) =>
  error instanceof Error && error.message && !/^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : fallback;

export function StudentEnrollmentAccess({
  studentId,
  labels,
  onChanged,
}: {
  studentId: string;
  /** Curso y cohorte de cada matrícula, para elegirla sin códigos técnicos. */
  labels?: Record<string, string>;
  onChanged?: () => void;
}) {
  const state = useFetch<IndividualEnrollmentAccess>(
    `/admin/estudiantes/${encodeURIComponent(studentId)}/matriculas/acceso`,
  );
  const [selected, setSelected] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState<{ end?: boolean; reason?: boolean }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const extendable = (state.data?.enrollments ?? []).filter(
    (e) => e.guardReady && ["activo", "finalizado"].includes(e.status),
  );
  const list = extendable.length ? extendable : (state.data?.enrollments ?? []);
  const enrollment = list.find((e) => e.id === selected) ?? list[0];
  async function submit(repeat = false) {
    if (!enrollment) return;
    const missing = { end: !repeat && !end, reason: !reason.trim() };
    setInvalid(missing);
    if (missing.end || missing.reason) {
      setMessage(null);
      window.requestAnimationFrame(() =>
        document.getElementById(missing.end ? "access-end" : "access-reason")?.focus(),
      );
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
          : "Acceso extendido. Las fechas de prácticas no cambian.",
      );
      setEnd("");
      setReason("");
      state.refetch();
      onChanged?.();
    } catch (error) {
      setMessage(
        friendly(error, "No se pudo completar la operación. Recarga antes de reintentar."),
      );
    } finally {
      setBusy(false);
    }
  }
  if (state.data?.active === false) return null;
  if (state.error)
    return (
      <p role="status">{friendly(new Error(state.error), "No se pudo consultar el acceso.")}</p>
    );
  if (!enrollment)
    return state.isLoading ? <p role="status">Consultando el acceso del alumno…</p> : null;
  const canExtend = enrollment.guardReady && ["activo", "finalizado"].includes(enrollment.status);
  return (
    <section
      aria-labelledby="extend-access"
      className="grid gap-3 rounded-md border border-border bg-bg-surface p-4"
    >
      <h3 id="extend-access" className="text-base font-semibold">
        Extender acceso
      </h3>
      {list.length > 1 ? (
        <Select
          label="Matrícula"
          value={enrollment.id}
          onChange={(e) => {
            setSelected(e.target.value);
            setEnd("");
            setMessage(null);
            setInvalid({});
          }}
        >
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {labels?.[e.id] ?? `Tipo ${e.type}`}
            </option>
          ))}
        </Select>
      ) : null}
      <p className="text-sm">
        {enrollment.accessEndDate
          ? `El acceso del alumno termina el ${longDate(enrollment.accessEndDate)}. Amplíalo si necesita más tiempo.`
          : "El acceso del alumno todavía no tiene fecha de fin."}
      </p>
      {!enrollment.guardReady ? (
        <p role="status" className="text-sm text-text-secondary">
          Esta matrícula antigua todavía no se puede extender desde aquí.
        </p>
      ) : null}
      {canExtend ? (
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy} className="grid gap-3">
            <Input
              id="access-end"
              label="Nuevo fin del acceso *"
              type="date"
              min={today()}
              aria-required="true"
              error={invalid.end && !end ? "Este campo es obligatorio." : undefined}
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setInvalid((v) => ({ ...v, end: false }));
              }}
            />
            <Textarea
              id="access-reason"
              label="Motivo *"
              maxLength={500}
              rows={3}
              aria-required="true"
              error={invalid.reason && !reason.trim() ? "Este campo es obligatorio." : undefined}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setInvalid((v) => ({ ...v, reason: false }));
              }}
            />
            <Button type="submit" isLoading={busy} className="justify-self-start">
              Extender acceso
            </Button>
          </fieldset>
        </form>
      ) : null}
      {enrollment.status === "finalizado" ? (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          className="justify-self-start"
          onClick={() => void submit(true)}
        >
          Autorizar repetición con excepción
        </Button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
