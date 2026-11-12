"use client";
import { useState } from "react";
import { landingContent,whatsappHref } from "@/lib/content/landing";
import { Button } from "@/components/ui/Button";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { StudentScheduleInput } from "@/types/studentSchedule";
interface State {
  active: boolean;
  types: Partial<Record<"A" | "B", { registeredAt: string }>>;
  enrollments?: { id: string; type: "A" | "B" }[];
}
export function WaitlistControl({
  enrollmentId,
  input,
}: {
  enrollmentId: string;
  input: StudentScheduleInput;
}) {
  const state = useFetch<State>("/estudiantes/inscripcion/espera");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const type = state.data?.enrollments?.find((e) => e.id === enrollmentId)?.type;
  async function register() {
    if (!type) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post("/estudiantes/inscripcion/espera", {
        tipo: type,
        preferencia: { modalidad: input.modalidad, horasPorDia: input.horasPorDia },
      });
      state.refetch();
      setMessage(
        "Te avisaremos por correo cuando haya una apertura con disponibilidad. La asignación está sujeta a cupos disponibles.",
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
  const contact=landingContent.whatsapp[0]?.international;
  const whatsapp=contact && /^\d{8,15}$/.test(contact)?whatsappHref("Hola, quisiera consultar horarios disponibles para inscribirme.",contact):null;
  if (state.data?.active === false) return null;
  return (
    <div className="mt-3 grid gap-2">
      {state.error ? <p role="alert">{state.error}</p> : null}
      {type && state.data?.types[type] ? (
        <p role="status">
          Tu aviso de apertura está registrado. Se retira al confirmar la entrega del correo.
        </p>
      ) : type ? (
        <Button type="button" variant="secondary" isLoading={busy} onClick={() => void register()}>
          Avísame cuando abra
        </Button>
      ) : null}
      {whatsapp?<a className="text-sm underline" href={whatsapp} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>:null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
