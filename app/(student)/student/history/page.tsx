"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, EmptyState, Pagination, Select, StatusBadge } from "@/components/ui";
import { PracticeRatingModal } from "@/components/practice-ratings/PracticeRatingModal";
import { useFetch } from "@/hooks/useFetch";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { PendingPracticeRating } from "@/types/practiceRating";
import type {
  PracticeHistoryEnrollment,
  PracticeHistoryItem,
  PracticeHistoryPage,
} from "@/types/practiceAttendance";

const enrollmentLabels: Record<PracticeHistoryEnrollment["status"], string> = {
  activo: "Activa",
  pendiente_cohorte: "Pendiente de cohorte",
  finalizado: "Finalizada",
  retirado: "Retirada",
};
const stateLabels: Record<PracticeHistoryItem["estado"], string> = {
  asistio: "Asistió",
  no_asistio: "No asistió",
  pendiente: "Pendiente",
  liberada: "Liberada",
  falta: "Cancelada sin reprogramación (cuenta como falta)",
  cancelada: "Cancelada",
};
const hours = (value: number) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(value);
function practiceDescription(item: PracticeHistoryItem): string {
  switch (item.estado) {
    case "asistio":
      return "Esta práctica suma horas asistidas.";
    case "no_asistio":
      return "Esta práctica no suma horas asistidas.";
    case "falta":
      return "Agotaste las dos reprogramaciones. Esta hora no se restituye ni suma horas asistidas.";
    case "cancelada":
      return item.resultado === "hora_perdida"
        ? "La hora se perdió y no se repone."
        : "Esta práctica fue reemplazada por otro horario.";
    case "liberada":
      return item.resultado === "reprogramable"
        ? "Liberada para reprogramar."
        : "Reserva liberada; consulta tus horarios disponibles.";
    case "pendiente":
      return item.slotStatus === "completado"
        ? "El instructor aún no registra tu asistencia."
        : "Práctica programada; la asistencia real la registra el instructor.";
  }
}

function HoursSummary({ summary }: { summary: PracticeHistoryPage["summary"] }) {
  const target = summary.horasObjetivo;
  const hasTarget = target !== null && target > 0;
  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <Card title="Horas asistidas para certificarte">
        <p className="mb-3 text-lg font-semibold tabular-nums text-text-primary">
          {hasTarget
            ? `${hours(summary.horasAsistidas)} de ${hours(target)} horas asistidas`
            : `${hours(summary.horasAsistidas)} horas asistidas`}
        </p>
        {hasTarget ? (
          <div
            role="progressbar"
            aria-label="Progreso de horas asistidas"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.max(0, Math.min(summary.horasAsistidas, target))}
            aria-valuetext={`${hours(summary.horasAsistidas)} de ${hours(target)} horas asistidas`}
            className="h-3 overflow-hidden rounded-full bg-bg-sunken"
          >
            <div
              className="h-full rounded-full bg-brand-primary"
              style={{
                width: `${Math.max(0, Math.min(summary.horasAsistidas / target, 1)) * 100}%`,
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Objetivo de horas sin registrar. Consulta al administrador.
          </p>
        )}
        <p className="mt-3 text-sm text-text-secondary">
          Solo las prácticas registradas como «Asistió» cuentan para la certificación.
        </p>
      </Card>
      <Card title="Horas perdidas">
        <p className="text-lg font-semibold tabular-nums text-text-primary">
          {hours(summary.horasPerdidas)} horas
        </p>
        <p className="mt-3 text-sm text-text-secondary">
          Dato informativo: incluye inasistencias y cancelaciones sin reposición. No reduce las
          horas que debes cumplir.
        </p>
      </Card>
    </div>
  );
}

function EnrollmentHistory({
  enrollmentId,
  pendingItems,
  onRate,
}: {
  enrollmentId: string;
  pendingItems: PendingPracticeRating[];
  onRate: (practice: PendingPracticeRating) => void;
}) {
  const [page, setPage] = useState(1);
  const result = useFetch<PracticeHistoryPage>(
    `/estudiantes/practice-history?enrollmentId=${encodeURIComponent(enrollmentId)}&page=${page}&pageSize=20`,
  );
  const data =
    result.data?.enrollmentId === enrollmentId && result.data.page === page ? result.data : null;
  const loading = result.isLoading || (!result.error && !data);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (data && page > 1) heading.current?.focus();
  }, [data, page]);
  return (
    <div className="flex min-w-0 flex-col gap-5" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-xl font-semibold text-text-primary"
        >
          Historial de prácticas
        </h2>
        <Button variant="secondary" size="sm" disabled={loading} onClick={result.refetch}>
          Actualizar historial
        </Button>
      </div>
      {loading ? (
        <p role="status" className="py-5 text-sm text-text-secondary">
          Cargando historial…
        </p>
      ) : result.error ? (
        <EmptyState
          error
          title={
            result.errorStatus === 409
              ? "Tu historial necesita revisión"
              : "No se pudo cargar el historial"
          }
          description={
            result.errorStatus === 409
              ? "Hay matrículas en la misma cohorte y no podemos separar tus prácticas. Pide al administrador que revise tu historial."
              : "No pudimos consultar tus prácticas. Inténtalo de nuevo."
          }
          action={
            <Button variant="secondary" onClick={result.refetch}>
              Reintentar historial
            </Button>
          }
        />
      ) : data ? (
        <>
          <HoursSummary summary={data.summary} />
          {!data.items.length ? (
            <EmptyState
              title="Sin prácticas en esta página"
              description="Cuando tengas prácticas, podrás consultar aquí su asistencia y tus avisos de inasistencia."
            />
          ) : (
            <ol className="divide-y divide-border rounded-md border border-border bg-bg-surface px-4 md:px-6">
              {data.items.map((item) => (
                <li key={item.id} className="flex min-w-0 flex-col gap-3 py-5 text-sm">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <time dateTime={item.scheduledAt} className="font-medium text-text-primary">
                      {formatPracticeDateTime(item.scheduledAt, true)}
                    </time>
                    <StatusBadge
                      status={item.estado}
                      label={stateLabels[item.estado]}
                      tone={
                        item.estado === "asistio"
                          ? "success"
                          : item.estado === "pendiente"
                            ? "info"
                            : "neutral"
                      }
                    />
                  </div>
                  <p className="text-text-secondary">{practiceDescription(item)}</p>
                  {item.durationMinutes !== null ? (
                    <p className="text-text-secondary">Duración: {item.durationMinutes} minutos</p>
                  ) : null}
                  {item.motivo ? (
                    <p className="whitespace-pre-wrap break-words text-text-secondary">
                      Motivo: {item.motivo}
                    </p>
                  ) : null}
                  {pendingItems.find(
                    (pending) => pending.practiceSlotId === item.practiceSlotId,
                  ) ? (
                    <Button
                      size="sm"
                      className="self-start"
                      onClick={() => {
                        const practice = pendingItems.find(
                          (pending) => pending.practiceSlotId === item.practiceSlotId,
                        );
                        if (practice) onRate(practice);
                      }}
                    >
                      Calificar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          <Pagination
            page={page}
            pageSize={20}
            total={data.total}
            singular="práctica"
            plural="prácticas"
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}

export default function StudentHistoryPage() {
  const pending = usePendingPracticeRatings();
  const [selectedRating, setSelectedRating] = useState<PendingPracticeRating | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const enrollments = useFetch<PracticeHistoryEnrollment[]>(
    "/estudiantes/practice-history/enrollments",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const enrollment =
    enrollments.data?.find((e) => e.enrollmentId === selected) ?? enrollments.data?.[0];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Mi historial de asistencia
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tus prácticas y horas asistidas. Hora de Ecuador (America/Guayaquil).
        </p>
      </header>
      {ratingSuccess ? (
        <p role="status" className="text-sm text-status-success">
          Gracias, tu calificación se envió correctamente.
        </p>
      ) : null}
      {pending.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <span>No pudimos consultar tus encuestas pendientes.</span>
          <Button variant="secondary" size="sm" onClick={pending.refetch}>
            Reintentar encuestas
          </Button>
        </div>
      ) : null}
      {enrollments.isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Cargando matrículas…
        </p>
      ) : enrollments.error ? (
        <EmptyState
          error
          title="No se pudieron cargar tus matrículas"
          description="Inténtalo de nuevo para consultar tu historial."
          action={
            <Button variant="secondary" onClick={enrollments.refetch}>
              Reintentar matrículas
            </Button>
          }
        />
      ) : !enrollment ? (
        <EmptyState
          title="Aún no tienes matrículas"
          description="Tu historial aparecerá cuando tengas una matrícula."
        />
      ) : (
        <>
          {enrollments.data!.length > 1 ? (
            <Select
              label="Matrícula"
              value={enrollment.enrollmentId}
              onChange={(event) => setSelected(event.target.value)}
            >
              {enrollments.data!.map((e, index) => (
                <option key={e.enrollmentId} value={e.enrollmentId}>
                  Curso tipo {e.courseType} · {enrollmentLabels[e.status]} · Matrícula {index + 1}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-text-secondary">
              Curso tipo {enrollment.courseType} · {enrollmentLabels[enrollment.status]}
            </p>
          )}
          <EnrollmentHistory
            key={enrollment.enrollmentId}
            enrollmentId={enrollment.enrollmentId}
            pendingItems={pending.items}
            onRate={(practice) => {
              setRatingSuccess(false);
              setSelectedRating(practice);
            }}
          />
        </>
      )}
      <PracticeRatingModal
        practice={selectedRating}
        onClose={() => setSelectedRating(null)}
        onSubmitted={() => {
          setSelectedRating(null);
          setRatingSuccess(true);
          pending.refetch();
        }}
        onStale={pending.refetch}
      />
    </div>
  );
}
