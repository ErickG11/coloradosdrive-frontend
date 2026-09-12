"use client";

import { useState } from "react";

import { Button, Card, StatusBadge } from "@/components/ui";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlotWithNames } from "@/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InstructorSchedulePage() {
  // studentName ya viene embebido en cada franja (ver docs/adr/008 en el
  // backend) - el instructor no necesita resolverlo aparte contra
  // /users (admin-only). GET /practice-slots devuelve todas las franjas
  // del propio instructor, en cualquier estado (RF-03: "acceso de solo
  // lectura a su disponibilidad semanal y a los estudiantes asignados").
  const {
    data: slots,
    isLoading,
    error,
    refetch: refetchSlots,
  } = useFetch<PracticeSlotWithNames[]>("/practice-slots");

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);

  async function handleMarkAttendance(slotId: string, attended: boolean) {
    setActionError(null);
    setPendingSlotId(slotId);
    try {
      await api.patch(`/practice-slots/${slotId}/attendance`, { attended });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo registrar la asistencia.");
    } finally {
      setPendingSlotId(null);
      refetchSlots();
    }
  }

  const sortedSlots = [...(slots ?? [])].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        Horarios de práctica
      </h1>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {actionError ? <p className="text-sm text-accent-red">{actionError}</p> : null}

      {!isLoading && !error ? (
        sortedSlots.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Todavía no tienes franjas asignadas.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedSlots.map((slot) => (
              <Card key={slot.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-text-primary">
                      {formatDateTime(slot.scheduledAt)}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {slot.durationMinutes} min · {slot.studentName ?? "Sin estudiante asignado"}
                    </span>
                  </div>
                  <StatusBadge status={slot.status} />
                </div>

                {slot.status === "completado" ? (
                  <div className="flex items-center justify-end gap-3">
                    <span className="mr-auto text-sm text-text-secondary">
                      {slot.attended === null
                        ? "Asistencia sin registrar"
                        : slot.attended
                          ? "Asistió"
                          : "No asistió"}
                    </span>
                    <Button
                      variant={slot.attended === false ? "primary" : "secondary"}
                      icon={<XIcon className="h-4 w-4" />}
                      isLoading={pendingSlotId === slot.id}
                      onClick={() => void handleMarkAttendance(slot.id, false)}
                    >
                      No asistió
                    </Button>
                    <Button
                      variant={slot.attended === true ? "primary" : "secondary"}
                      icon={<CheckIcon className="h-4 w-4" />}
                      isLoading={pendingSlotId === slot.id}
                      onClick={() => void handleMarkAttendance(slot.id, true)}
                    >
                      Asistió
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
