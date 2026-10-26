"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Card, FormError, StatusBadge } from "@/components/ui";
import { CheckIcon, ClaimIcon, XIcon } from "@/components/ui/icons";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useFetch } from "@/hooks/useFetch";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import type { PracticeSlotStatus, StudentPracticeSlot } from "@/types";
import type { CancellationPreview, CancelPracticeSlotResult } from "@/types/practiceSlot";

import { CancelPracticeModal, cancellationConsequence } from "./CancelPracticeModal";

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
    isLoading,
    error,
    refetch: refetchSlots,
  } = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const { data: enrollments, error: enrollmentsError } = useFetch<
    { cohortId: string | null; courseType: "A" | "B" }[]
  >("/estudiantes/enrollments");

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [confirmationDue, setConfirmationDue] = useState(false);
  const [noPracticeNotice, setNoPracticeNotice] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ slotId: string; preview: CancellationPreview } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const cancelTrigger = useRef<HTMLButtonElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (successNotice) successRef.current?.focus();
  }, [successNotice]);

  const userId = useCurrentUserId();
  // Ambas cohortes propias, incluso si todavía no tienen franjas visibles.
  const cohortId = enrollments?.find((e) => e.courseType === "A")?.cohortId ?? null;
  const cohortB = enrollments?.find((e) => e.courseType === "B")?.cohortId ?? null;

  useRealtimeChannel(cohortId ? `cohort-${cohortId}-practice-slots` : null, {
    "slot-released": () => refetchSlots(),
  });
  useRealtimeChannel(cohortB ? `cohort-${cohortB}-practice-slots` : null, {
    "slot-released": () => refetchSlots(),
  });
  useRealtimeChannel(userId ? `user-${userId}-practice-slots` : null, {
    "confirmation-requested": () => {
      setConfirmationDue(true);
      refetchSlots();
    },
    "no-practice": () => {
      setNoPracticeNotice(true);
      refetchSlots();
    },
  });

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

  async function handleCancelPreview(slotId: string, trigger: HTMLButtonElement) {
    cancelTrigger.current = trigger;
    setActionError(null);
    setSuccessNotice(null);
    setPendingSlotId(slotId);
    try {
      const preview = await api.get<CancellationPreview>(`/practice-slots/${slotId}/cancel-preview`);
      setCancelTarget({ slotId, preview });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo consultar la cancelación.");
      refetchSlots();
    } finally {
      setPendingSlotId(null);
    }
  }

  function closeCancelModal() {
    setCancelTarget(null);
    cancelTrigger.current?.focus();
  }

  function handleCancelled(result: CancelPracticeSlotResult) {
    setCancelTarget(null);
    setActionError(null);
    setSuccessNotice(`Práctica cancelada. ${cancellationConsequence(result.cancelacion.resultado)} Te quedan ${result.cancelacion.reprogramacionesRestantes} de 2 reprogramaciones.`);
    refetchSlots();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        Horarios de práctica
      </h1>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {enrollmentsError ? (
        <p role="alert" className="text-sm text-accent-red">
          {enrollmentsError}
        </p>
      ) : null}
      {actionError ? <FormError>{actionError}</FormError> : null}

      {successNotice ? (
        <div ref={successRef} role="status" tabIndex={-1} className="fixed bottom-4 right-4 z-40 max-w-sm rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-elevated outline-none dark:border-green-500 dark:bg-green-950 dark:text-green-100">
          <div className="flex items-start gap-3">
            <span>{successNotice}</span>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setSuccessNotice(null)} className="font-medium hover:underline">Cerrar</button>
          </div>
        </div>
      ) : null}

      {noPracticeNotice ? (
        <div className="flex items-center justify-between gap-4 rounded-md border border-accent-red bg-accent-red-subtle px-4 py-3 text-sm text-accent-red">
          <span>Esta práctica ya no se realizará. Consulta tus horarios actualizados.</span>
          <button
            type="button"
            onClick={() => setNoPracticeNotice(false)}
            className="shrink-0 font-medium hover:underline"
          >
            Entendido
          </button>
        </div>
      ) : null}

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
              ownSlots.map((slot) => {
                const isConfirmationDue = confirmationDue && slot.status === "asignado";
                return (
                  <Card
                    key={slot.id}
                    className={cn("flex flex-col gap-3", isConfirmationDue && "border-accent-blue")}
                  >
                    {isConfirmationDue ? (
                      <p className="text-sm font-medium text-accent-blue">
                        Tu práctica está por empezar. Puedes confirmar tu asistencia si deseas;
                        si no respondes, se asume que asistirás.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-text-primary">
                          {formatDateTime(slot.scheduledAt)}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {slot.durationMinutes} min · {"instructorName" in slot ? slot.instructorName : ""}
                        </span>
                      </div>
                      <StatusBadge status={slot.status} />
                    </div>
                    <div className="flex justify-end gap-3">
                      {slot.status === "asignado" ? (
                        <Button
                          variant="secondary"
                          icon={<CheckIcon className="h-4 w-4" />}
                          isLoading={pendingSlotId === slot.id}
                          disabled={pendingSlotId !== null}
                          onClick={() => handleConfirm(slot.id)}
                        >
                          Confirmar asistencia (opcional)
                        </Button>
                      ) : null}
                      <Button
                        variant="danger"
                        icon={<XIcon className="h-4 w-4" />}
                        isLoading={pendingSlotId === slot.id}
                        disabled={pendingSlotId !== null}
                        onClick={(event) => { void handleCancelPreview(slot.id, event.currentTarget); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Franjas disponibles
            </h2>
            {availableSlots.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">
                  No hay franjas disponibles en tus cohortes por ahora.
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
                        {slot.durationMinutes} min
                      </span>
                    </div>
                    <Button
                      icon={<ClaimIcon className="h-4 w-4" />}
                      isLoading={pendingSlotId === slot.id}
                      onClick={() => handleClaim(slot.id)}
                    >
                      Reclamar
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
      {cancelTarget ? (
        <CancelPracticeModal
          key={cancelTarget.slotId}
          slotId={cancelTarget.slotId}
          preview={cancelTarget.preview}
          onClose={closeCancelModal}
          onCancelled={handleCancelled}
        />
      ) : null}
    </div>
  );
}
