"use client";

import { useMemo, useState } from "react";

import { Button, Card, StatusBadge } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlot, PracticeSlotStatus, UserSummary } from "@/types";

const ACTIVE_OWN_STATUSES: PracticeSlotStatus[] = ["asignado", "confirmado"];
const AVAILABLE_STATUSES: PracticeSlotStatus[] = ["disponible", "liberado"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentSchedulePage() {
  const {
    data: slots,
    isLoading: isLoadingSlots,
    error: slotsError,
    refetch: refetchSlots,
  } = useFetch<PracticeSlot[]>("/practice-slots");
  const {
    data: instructors,
    isLoading: isLoadingInstructors,
    error: instructorsError,
  } = useFetch<UserSummary[]>("/users?rol=instructor");

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);

  const instructorsById = useMemo(
    () => new Map((instructors ?? []).map((user) => [user.id, user.nombreCompleto])),
    [instructors],
  );

  const isLoading = isLoadingSlots || isLoadingInstructors;
  const error = slotsError ?? instructorsError;

  // Cualquier franja con studentId no nulo en esta lista es, por
  // construcción, del propio estudiante (el backend solo incluye
  // disponible/liberado -sin estudiante- o las suyas propias, ver
  // practiceSlot.service.ts::listSlotsForStudent). Se muestran solo las
  // "activas" (asignado/confirmado); completado/sin_practica son
  // historial, fuera de alcance de esta pantalla.
  const ownSlots = (slots ?? []).filter(
    (slot) => slot.studentId !== null && ACTIVE_OWN_STATUSES.includes(slot.status),
  );
  const availableSlots = (slots ?? [])
    .filter((slot) => AVAILABLE_STATUSES.includes(slot.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  async function performAction(
    slotId: string,
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    setActionError(null);
    setPendingSlotId(slotId);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fallbackMessage);
    } finally {
      setPendingSlotId(null);
      // Se refresca incluso si falló: un 409 por condición de carrera
      // (ej. alguien más ya reclamó la franja) significa que la lista ya
      // está desactualizada, así que traer el estado real la corrige.
      refetchSlots();
    }
  }

  function handleClaim(slotId: string) {
    void performAction(
      slotId,
      () => api.post(`/practice-slots/${slotId}/claim`),
      "No se pudo reclamar la franja.",
    );
  }

  function handleConfirm(slotId: string) {
    void performAction(
      slotId,
      () => api.post(`/practice-slots/${slotId}/confirm`),
      "No se pudo confirmar la franja.",
    );
  }

  function handleCancel(slotId: string) {
    void performAction(
      slotId,
      () => api.post(`/practice-slots/${slotId}/cancel`),
      "No se pudo cancelar la franja.",
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        Horarios de práctica
      </h1>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {actionError ? <p className="text-sm text-accent-red">{actionError}</p> : null}

      {!isLoading && !error ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Tu franja</h2>
            {ownSlots.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">
                  No tienes ninguna franja reclamada todavía.
                </p>
              </Card>
            ) : (
              ownSlots.map((slot) => (
                <Card key={slot.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-text-primary">
                        {formatDateTime(slot.scheduledAt)}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {slot.durationMinutes} min ·{" "}
                        {instructorsById.get(slot.instructorId) ?? "Instructor"}
                      </span>
                    </div>
                    <StatusBadge status={slot.status} />
                  </div>
                  <div className="flex justify-end gap-3">
                    {slot.status === "asignado" ? (
                      <Button
                        variant="secondary"
                        isLoading={pendingSlotId === slot.id}
                        onClick={() => handleConfirm(slot.id)}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      isLoading={pendingSlotId === slot.id}
                      onClick={() => handleCancel(slot.id)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Franjas disponibles
            </h2>
            {availableSlots.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">
                  No hay franjas disponibles en tu cohorte por ahora.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {availableSlots.map((slot) => (
                  <Card key={slot.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-text-primary">
                        {formatDateTime(slot.scheduledAt)}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {slot.durationMinutes} min ·{" "}
                        {instructorsById.get(slot.instructorId) ?? "Instructor"}
                      </span>
                    </div>
                    <Button isLoading={pendingSlotId === slot.id} onClick={() => handleClaim(slot.id)}>
                      Reclamar
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
