"use client";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import { EnrollmentIcon } from "@/components/inscripcion/EnrollmentVisual";
import { useState } from "react";
import { landingContent, whatsappHref } from "@/lib/content/landing";
import { Button } from "@/components/ui/Button";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { StudentScheduleInput } from "@/types/studentSchedule";
interface State {
  active: boolean;
  expiryDays?: number;
  types: Partial<Record<"A" | "B", { registeredAt: string }>>;
  enrollments?: { id: string; type: "A" | "B" }[];
}
export function WaitlistControl({
  enrollmentId,
}: {
  enrollmentId: string;
  input?: StudentScheduleInput;
}) {
  const state = useFetch<State>("/estudiantes/inscripcion/espera");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const type = state.data?.enrollments?.find((e) => e.id === enrollmentId)?.type;
  async function register(remove = false) {
    if (!type) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post("/estudiantes/inscripcion/espera", {
        tipo: type,
        quitar: remove,
      });
      state.refetch();
      setMessage(remove ? "Aviso retirado." : "Listo, te avisaremos por correo.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el aviso. Consulta nuevamente antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const contact = landingContent.whatsapp[0]?.international;
  const whatsapp =
    contact && /^\d{8,15}$/.test(contact)
      ? whatsappHref("Hola, quisiera consultar horarios disponibles para inscribirme.", contact)
      : null;
  if (state.data?.active === false) return null;
  return (
    <div className="mt-3 grid gap-2">
      {state.error ? <p role="alert">{state.error}</p> : null}
      {type && state.data?.types[type] ? (
        <>
          <p role="status">Listo, te avisaremos por correo.</p>
          <p className="text-sm text-text-secondary">Estado: Esperando curso.</p>
          <button
            type="button"
            className="justify-self-start text-sm underline"
            disabled={busy}
            onClick={() => void register(true)}
          >
            Dejar de recibir avisos
          </button>
        </>
      ) : type ? (
        <Button type="button" variant="secondary" isLoading={busy} onClick={() => void register()}>
          Avísame cuando abra
        </Button>
      ) : null}
      {whatsapp ? (
        <a className="text-sm underline" href={whatsapp} target="_blank" rel="noopener noreferrer">
          Consultar por WhatsApp
        </a>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}

const COURSE_NAME = { A: "Motocicletas", B: "Vehículos livianos" } as const;

// Panel único cuando no hay ningún curso abierto del tipo del alumno.
export function NoOpenCoursePanel({ enrollmentId }: { enrollmentId: string }) {
  const state = useFetch<State>("/estudiantes/inscripcion/espera");
  const type = state.data?.enrollments?.find((e) => e.id === enrollmentId)?.type;
  return (
    <StudentEmptyState
      icon={<EnrollmentIcon name="calendar" />}
      title={
        type
          ? `Por ahora no hay un curso abierto de ${COURSE_NAME[type]}`
          : "Por ahora no hay un curso abierto"
      }
      description="Te avisaremos por correo apenas se abra uno. Después de recibir el aviso, entra y elige tu horario."
      actions={<WaitlistControl enrollmentId={enrollmentId} />}
    />
  );
}

export function WaitlistPreferences() {
  const state = useFetch<State>("/estudiantes/inscripcion/espera");
  const [message, setMessage] = useState<string | null>(null);
  if (!state.data?.active || !Object.keys(state.data.types).length) return null;
  return (
    <div>
      <p>Avisos de apertura registrados. Puedes retirarlos aquí.</p>
      {(["A", "B"] as const)
        .filter((type) => state.data?.types[type])
        .map((type) => (
          <Button
            key={type}
            type="button"
            variant="secondary"
            onClick={() => {
              void api
                .post("/estudiantes/inscripcion/espera", { tipo: type, quitar: true })
                .then(() => {
                  state.refetch();
                  setMessage("Aviso retirado.");
                })
                .catch(() => setMessage("No se pudo retirar el aviso. Reintenta."));
            }}
          >
            No recibir avisos del tipo {type}
          </Button>
        ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
