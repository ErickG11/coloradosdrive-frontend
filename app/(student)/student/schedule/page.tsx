"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Card, FormError, StatusBadge } from "@/components/ui";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useFetch } from "@/hooks/useFetch";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import type { PracticeSlotStatus, StudentPracticeSlot } from "@/types";
import type { CancellationPreview, CancelPracticeSlotResult, PendingPracticeSlot, ReleasedPracticeSlot, SwapPracticeResult } from "@/types/practiceSlot";

import { CancelPracticeModal, cancellationConsequence } from "./CancelPracticeModal";
import { formatPracticeDateTime } from "./formatPracticeDateTime";
import { SwapPracticeModal } from "./SwapPracticeModal";

const ACTIVE_OWN_STATUSES: PracticeSlotStatus[] = ["asignado", "confirmado"];

export default function StudentSchedulePage() {
  const {
    data: slots,
    isLoading,
    error,
    refetch: refetchSlots,
  } = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const { data: releasedSlots, isLoading: releasedLoading, error: releasedError, refetch: refetchReleased } =
    useFetch<ReleasedPracticeSlot[]>("/practice-slots/released-for-me");
  const { data: pendingPractices, isLoading: pendingLoading, error: pendingError, refetch: refetchPending } =
    useFetch<PendingPracticeSlot[]>("/practice-slots/my-pending");
  const { data: enrollments, error: enrollmentsError } = useFetch<
    { cohortId: string | null; courseType: "A" | "B" }[]
  >("/estudiantes/enrollments");

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [confirmationDue, setConfirmationDue] = useState(false);
  const [noPracticeNotice, setNoPracticeNotice] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ slotId: string; preview: CancellationPreview } | null>(null);
  const [swapTarget, setSwapTarget] = useState<ReleasedPracticeSlot | null>(null);
  const [knownRemaining, setKnownRemaining] = useState<number | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const cancelTrigger = useRef<HTMLButtonElement | null>(null);
  const swapTrigger = useRef<HTMLButtonElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (successNotice) successRef.current?.focus();
  }, [successNotice]);

  useEffect(() => {
    const refreshTime = () => setCurrentTime(Date.now());
    const initialRefresh = window.setTimeout(refreshTime, 0);
    const refreshInterval = window.setInterval(refreshTime, 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const counterSlotId = currentTime === null ? null : slots?.find((slot) => slot.studentId !== null
    && ACTIVE_OWN_STATUSES.includes(slot.status)
    && new Date(slot.scheduledAt).getTime() > currentTime)?.id ?? null;
  useEffect(() => {
    if (!counterSlotId) return;
    let active = true;
    api.get<CancellationPreview>(`/practice-slots/${counterSlotId}/cancel-preview`)
      .then((preview) => {
        if (active && typeof preview?.reprogramacionesRestantes === "number") {
          setKnownRemaining(preview.reprogramacionesRestantes);
        }
      })
      .catch(() => { /* El contador también puede venir del listado de cupos o una acción. */ });
    return () => { active = false; };
  }, [counterSlotId]);

  const userId = useCurrentUserId();
  // Ambas cohortes propias, incluso si todavía no tienen franjas visibles.
  const cohortId = enrollments?.find((e) => e.courseType === "A")?.cohortId ?? null;
  const cohortB = enrollments?.find((e) => e.courseType === "B")?.cohortId ?? null;

  useRealtimeChannel(cohortId ? `cohort-${cohortId}-practice-slots` : null, {
    "slot-released": () => { refetchSlots(); refetchReleased(); },
    "slot-taken": () => { refetchSlots(); refetchReleased(); },
  });
  useRealtimeChannel(cohortB ? `cohort-${cohortB}-practice-slots` : null, {
    "slot-released": () => { refetchSlots(); refetchReleased(); },
    "slot-taken": () => { refetchSlots(); refetchReleased(); },
  });
  useRealtimeChannel(userId ? `user-${userId}-practice-slots` : null, {
    "confirmation-requested": () => {
      setConfirmationDue(true);
      refetchSlots();
      refetchPending();
    },
    "no-practice": () => {
      setNoPracticeNotice(true);
      refetchSlots();
      refetchPending();
    },
    "slots-updated": () => { refetchSlots(); refetchPending(); refetchReleased(); },
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
  const availableSlots = (releasedSlots ?? [])
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const releasedCounts = new Set(availableSlots.map((slot) => slot.reprogramacionesRestantes));
  const displayedRemaining = releasedCounts.size > 1 ? null
    : releasedLoading && knownRemaining !== null ? knownRemaining
      : releasedCounts.size === 1 ? availableSlots[0].reprogramacionesRestantes
        : knownRemaining;

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
    setSuccessDetail(null);
    setPendingSlotId(slotId);
    try {
      const preview = await api.get<CancellationPreview>(`/practice-slots/${slotId}/cancel-preview`);
      setKnownRemaining(preview.reprogramacionesRestantes);
      setCancelTarget({ slotId, preview });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo revisar el aviso de inasistencia.");
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
    setSuccessNotice("Listo, avisamos que no asistirás a esta práctica");
    setSuccessDetail(`${cancellationConsequence(result.cancelacion.resultado)} Te quedan ${result.cancelacion.reprogramacionesRestantes} de 2 reprogramaciones.`);
    setKnownRemaining(result.cancelacion.reprogramacionesRestantes);
    refetchSlots();
    refetchReleased();
    refetchPending();
  }

  function openSwap(slot: ReleasedPracticeSlot, trigger: HTMLButtonElement) {
    swapTrigger.current = trigger;
    setActionError(null);
    setSuccessNotice(null);
    setSuccessDetail(null);
    setKnownRemaining(slot.reprogramacionesRestantes);
    setSwapTarget(slot);
  }

  function closeSwap() {
    setSwapTarget(null);
    swapTrigger.current?.focus();
  }

  function handleSwapped(result: SwapPracticeResult) {
    setSwapTarget(null);
    setKnownRemaining(result.reprogramacionesRestantes);
    setSuccessNotice("Listo, cambiaste tu horario");
    setSuccessDetail(null);
    refetchSlots();
    refetchReleased();
    refetchPending();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        Horarios de práctica
      </h1>

      {displayedRemaining !== null ? (
        <p className="text-sm text-text-secondary">Reprogramaciones disponibles: {displayedRemaining} de 2</p>
      ) : null}

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {enrollmentsError ? (
        <p role="alert" className="text-sm text-accent-red">
          {enrollmentsError}
        </p>
      ) : null}
      {releasedError ? <FormError>{releasedError}</FormError> : null}
      {pendingError ? <FormError>{pendingError}</FormError> : null}
      {actionError ? <FormError>{actionError}</FormError> : null}

      {successNotice ? (
        <div ref={successRef} role="status" tabIndex={-1} className="fixed bottom-4 right-4 z-40 max-w-sm rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-elevated outline-none dark:border-green-500 dark:bg-green-950 dark:text-green-100">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1">
              <span>{successNotice}</span>
              {successDetail ? <span className="text-xs">{successDetail}</span> : null}
            </div>
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
                  No tienes prácticas asignadas por ahora.
                </p>
              </Card>
            ) : (
              ownSlots.map((slot) => {
                const isConfirmationDue = confirmationDue && slot.status === "asignado";
                const canNotifyAbsence = currentTime !== null
                  && new Date(slot.scheduledAt).getTime() > currentTime;
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
                          {formatPracticeDateTime(slot.scheduledAt)}
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
                      {canNotifyAbsence ? (
                        <Button
                          variant="danger"
                          icon={<XIcon className="h-4 w-4" />}
                          isLoading={pendingSlotId === slot.id}
                          disabled={pendingSlotId !== null}
                          onClick={(event) => { void handleCancelPreview(slot.id, event.currentTarget); }}
                        >
                          No podré asistir
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Cupos disponibles para ti</h2>
            {releasedLoading ? <p className="text-sm text-text-secondary">Cargando cupos…</p> : null}
            {!releasedLoading && !releasedError && availableSlots.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">No hay cupos liberados por ahora.</p>
              </Card>
            ) : !releasedError ? (
              <div className="flex flex-col gap-3">
                {availableSlots.map((slot) => (
                  <Card key={slot.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-text-primary">
                        {formatPracticeDateTime(slot.scheduledAt)}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {slot.durationMinutes} min · {slot.caso === "A" ? "Reposición de hora pendiente" : "Cambio de práctica"}
                      </span>
                      {releasedCounts.size > 1 ? (
                        <span className="text-xs text-text-secondary">Reprogramaciones disponibles para este horario: {slot.reprogramacionesRestantes} de 2</span>
                      ) : null}
                    </div>
                    <Button
                      disabled={slot.caso === "B" && (pendingLoading || pendingError !== null)}
                      onClick={(event) => openSwap(slot, event.currentTarget)}
                    >
                      Tomar este horario
                    </Button>
                  </Card>
                ))}
              </div>
            ) : null}
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
      {swapTarget ? (
        <SwapPracticeModal
          key={swapTarget.id}
          slot={swapTarget}
          pending={pendingPractices ?? []}
          onClose={closeSwap}
          onSwapped={handleSwapped}
          onConflict={() => { refetchReleased(); refetchPending(); refetchSlots(); }}
        />
      ) : null}
    </div>
  );
}
