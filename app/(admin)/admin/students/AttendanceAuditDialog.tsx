"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Modal, Pagination } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { attendanceLabel } from "@/lib/utils/practiceAttendance";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { AttendanceEventsPage } from "@/types/practiceAttendance";
import type { UserSummary } from "@/types/user";

export function AttendanceAuditDialog({
  slotId,
  onClose,
}: {
  slotId: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [names, setNames] = useState<Record<string, string>>({});
  const result = useFetch<AttendanceEventsPage>(
    `/practice-slots/${slotId}/attendance/events?page=${page}&pageSize=20`,
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled(
      ["admin", "instructor"].map((role) =>
        api.get<UserSummary[]>(`/users?rol=${role}`, { signal: controller.signal }),
      ),
    ).then((responses) => {
      if (controller.signal.aborted) return;
      const users = responses.flatMap((response) =>
        response.status === "fulfilled" ? response.value : [],
      );
      setNames(Object.fromEntries(users.map((u) => [u.id, u.nombreCompleto])));
    });
    return () => controller.abort();
  }, []);
  const loading = result.isLoading || (!result.error && result.data?.page !== page);
  return (
    <Modal isOpen onClose={onClose} title="Auditoría de asistencia" className="max-w-2xl">
      <p className="mb-4 text-sm text-text-secondary">
        Registro inicial y correcciones. Hora de Ecuador (America/Guayaquil).
      </p>
      {loading ? (
        <p role="status" className="py-6 text-sm text-text-secondary">
          Cargando auditoría…
        </p>
      ) : result.error ? (
        <EmptyState
          error
          title="No se pudo cargar la auditoría"
          description={result.error}
          action={
            <Button variant="secondary" onClick={result.refetch}>
              Reintentar auditoría
            </Button>
          }
        />
      ) : !result.data?.items.length ? (
        <EmptyState
          title="Sin eventos de asistencia"
          description="Las asistencias anteriores a la auditoría pueden no tener registro de cambios."
        />
      ) : (
        <ol className="mb-5 flex flex-col divide-y divide-border">
          {result.data.items.map((event) => (
            <li key={event.id} className="flex min-w-0 flex-col gap-2 py-4 text-sm">
              <p className="font-semibold text-text-primary">
                {event.tipo === "registro" ? "Registro inicial" : "Corrección"}
              </p>
              <p className="break-words text-text-primary">
                Actor: {names[event.actorId] ?? "Nombre no disponible"} ·{" "}
                {event.actorRole === "admin" ? "Administrador" : "Instructor"}
              </p>
              <p className="break-all text-xs text-text-secondary">ID del actor: {event.actorId}</p>
              <time dateTime={event.createdAt} className="text-text-secondary">
                {formatPracticeDateTime(event.createdAt, true)}
              </time>
              <p className="text-text-primary">
                Valor anterior: {attendanceLabel(event.previousAttended)}. Valor nuevo:{" "}
                {attendanceLabel(event.newAttended)}.
              </p>
              <p className="whitespace-pre-wrap break-words text-text-secondary">
                Motivo: {event.motivo ?? "Registro inicial; no requiere motivo."}
              </p>
            </li>
          ))}
        </ol>
      )}
      {result.data && !result.error ? (
        <Pagination
          total={result.data.total}
          page={page}
          pageSize={20}
          singular="evento"
          plural="eventos"
          onPageChange={setPage}
          disabled={loading}
        />
      ) : null}
      <Button variant="secondary" className="mt-5" onClick={onClose}>
        Cerrar auditoría
      </Button>
    </Modal>
  );
}
