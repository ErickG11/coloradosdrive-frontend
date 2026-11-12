"use client";
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
  input: StudentScheduleInput;
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
      setMessage(
        remove
          ? "Aviso retirado."
          : "Te avisaremos de una apertura. La marca vence a los 60 días y no guarda horarios; la asignación está sujeta a cupos disponibles.",
      );
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
          <p role="status">
            Tu aviso está registrado; caduca a los {state.data?.expiryDays ?? 60} días.
          </p>
          <Button
            type="button"
            variant="secondary"
            isLoading={busy}
            onClick={() => void register(true)}
          >
            No recibir más avisos de este tipo
          </Button>
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
