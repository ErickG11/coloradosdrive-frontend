"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { PracticeRatingModal } from "@/components/practice-ratings/PracticeRatingModal";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { PendingPracticeRating } from "@/types/practiceRating";

function remaining(closesAt: string, now: number): string {
  const minutes = Math.ceil((Date.parse(closesAt) - now) / 60_000);
  if (!Number.isFinite(minutes)) return "Plazo no disponible";
  if (minutes <= 0) return "Plazo por actualizar";
  if (minutes < 60) return `${minutes} min restantes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest} min restantes`;
}

export function StudentPendingRatings() {
  const pending = usePendingPracticeRatings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("calificar");
  const refetch = pending.refetch;
  const previousRequest = useRef(requestedId);
  const [dismissedRequest, setDismissedRequest] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingPracticeRating | null>(null);
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (previousRequest.current !== requestedId) {
      previousRequest.current = requestedId;
      // El parámetro pertenece a la navegación; una nueva URL permite volver a abrirla.
      setDismissedRequest(null);
      if (requestedId) refetch();
    }
  }, [requestedId, refetch]);

  const requested =
    !pending.isLoading && !pending.error && requestedId !== dismissedRequest
      ? (pending.items.find((item) => item.practiceSlotId === requestedId) ?? null)
      : null;
  const practice = selected ?? requested;
  function close() {
    setDismissedRequest(requestedId);
    setSelected(null);
    if (requestedId) router.replace("/student");
  }
  function submitted() {
    setSuccess(true);
    close();
    pending.refetch();
  }

  return (
    <>
      <Card title="Encuestas pendientes" className="relative z-10 mt-5">
        {success ? (
          <p role="status" className="mb-4 text-sm text-status-success">
            Gracias, tu calificación se envió correctamente.
          </p>
        ) : null}
        {pending.isLoading ? (
          <p role="status" className="text-sm text-text-secondary">
            Cargando encuestas…
          </p>
        ) : null}
        {pending.error ? (
          <div role="alert" className="space-y-3 text-sm text-text-secondary">
            <p>No pudimos consultar tus encuestas pendientes.</p>
            <Button variant="secondary" size="sm" onClick={pending.refetch}>
              Reintentar
            </Button>
          </div>
        ) : null}
        {!pending.isLoading && !pending.error ? (
          pending.items.length ? (
            <ul className="divide-y divide-border">
              {pending.items.map((item) => (
                <li
                  key={item.practiceSlotId}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-text-primary">{item.instructorName}</p>
                    <p className="text-text-secondary">
                      Práctica:{" "}
                      <time dateTime={item.scheduledAt}>
                        {formatPracticeDateTime(item.scheduledAt, true)}
                      </time>
                    </p>
                    <p suppressHydrationWarning className="text-text-secondary">
                      {remaining(item.closesAt, now)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setSuccess(false);
                      setSelected(item);
                    }}
                  >
                    Calificar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No tienes encuestas pendientes.</p>
          )
        ) : null}
        {requestedId && !pending.isLoading && !pending.error && !requested && !selected ? (
          <p role="status" className="mt-3 text-sm text-text-secondary">
            Esta encuesta ya no está disponible. La lista se actualizó.
          </p>
        ) : null}
      </Card>
      <PracticeRatingModal
        practice={practice}
        onClose={close}
        onSubmitted={submitted}
        onStale={pending.refetch}
      />
    </>
  );
}
