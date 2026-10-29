"use client";

import { useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Modal,
  Pagination,
  StatusBadge,
  type DataColumn,
} from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type {
  InstructorRatingDetail,
  InstructorRatingList,
  InstructorRatingSummary,
} from "@/types/instructorRating";

const pageSize = 10;
const number = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function RatingSummary({
  average,
  responses,
  rankingEligible,
}: Pick<InstructorRatingSummary, "average" | "responses" | "rankingEligible">) {
  return (
    <div className="space-y-1">
      <p>{average === null ? "Sin calificaciones" : `${number.format(average)} / 5`}</p>
      <p className="text-sm text-text-secondary">
        {responses} {responses === 1 ? "calificación" : "calificaciones"}
      </p>
      {!rankingEligible && <p className="text-sm text-text-secondary">Pocas calificaciones</p>}
    </div>
  );
}

function RatingDetail({ instructorId }: { instructorId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useFetch<InstructorRatingDetail>(
    `/admin/instructor-ratings/${instructorId}?page=${page}&pageSize=${pageSize}`,
  );
  if (isLoading) return <p role="status">Cargando calificaciones…</p>;
  if (error || !data)
    return (
      <EmptyState
        error
        title="No se pudieron cargar las calificaciones"
        description={error ?? "Inténtalo de nuevo."}
        action={
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
        }
      />
    );
  return (
    <div className="space-y-6">
      <RatingSummary {...data} />
      <section aria-label="Desglose por estrellas" className="space-y-3">
        <h3 className="font-semibold text-text-primary">Desglose por estrellas</h3>
        {data.distribution.map(({ stars, count, percentage }) => (
          <div key={stars} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm text-text-secondary">
              <span>
                {stars} {stars === 1 ? "estrella" : "estrellas"}
              </span>
              <span>
                {count} · {percentage}%
              </span>
            </div>
            <div
              role="meter"
              aria-label={`${stars} ${stars === 1 ? "estrella" : "estrellas"}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              aria-valuetext={`${count} calificaciones, ${percentage}%`}
              className="h-2 overflow-hidden rounded-full bg-bg-sunken"
            >
              <div
                aria-hidden="true"
                className="h-full bg-text-secondary"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        ))}
      </section>
      <section aria-label="Calificaciones recibidas" className="space-y-3">
        <h3 className="font-semibold text-text-primary">Calificaciones recibidas</h3>
        {data.responses === 0 ? (
          <EmptyState
            title="Sin calificaciones"
            description="Este instructor aún no tiene respuestas vigentes."
          />
        ) : data.items.length === 0 ? (
          <p>No hay calificaciones en esta página.</p>
        ) : (
          <ul className="space-y-3">
            {data.items.map(({ score, comment }, index) => (
              <li key={`${page}-${index}`} className="rounded-md border border-border p-3">
                <p aria-label={`${score} de 5 estrellas`} className="font-medium text-text-primary">
                  {score} / 5
                </p>
                {comment && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary">
                    {comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          singular="calificación"
          plural="calificaciones"
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

export function InstructorRatings() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InstructorRatingSummary | null>(null);
  const { data, isLoading, error, refetch } = useFetch<InstructorRatingList>(
    `/admin/instructor-ratings?page=${page}&pageSize=${pageSize}`,
  );
  const columns: DataColumn<InstructorRatingSummary>[] = [
    {
      key: "position",
      header: "Posición",
      render: (row) =>
        ((data?.page ?? page) - 1) * (data?.pageSize ?? pageSize) +
        (data?.items.indexOf(row) ?? 0) +
        1,
    },
    {
      key: "instructor",
      header: "Instructor",
      render: (row) => (
        <div className="space-y-2">
          <Button variant="ghost" onClick={() => setSelected(row)}>
            {row.instructorName}
          </Button>
          {!row.active && <StatusBadge status="inactivo" />}
        </div>
      ),
    },
    { key: "rating", header: "Promedio y respuestas", render: (row) => <RatingSummary {...row} /> },
  ];
  return (
    <section aria-label="Ranking de instructores" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Calificaciones de instructores</h2>
        <p className="text-sm text-text-secondary">
          Todas las prácticas y cursos. Los instructores con al menos 3 respuestas aparecen primero.
        </p>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(row) => row.instructorId}
        caption="Ranking de instructores"
        mobileCards
        isLoading={isLoading}
        loadingLabel="Cargando ranking…"
        error={error}
        onRetry={refetch}
        empty={<EmptyState title="No hay instructores para mostrar" />}
      />
      {!isLoading && !error && data && (
        <Pagination
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          singular="instructor"
          plural="instructores"
          onPageChange={setPage}
        />
      )}
      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Calificaciones de ${selected.instructorName}` : "Calificaciones"}
      >
        {selected && (
          <RatingDetail key={selected.instructorId} instructorId={selected.instructorId} />
        )}
      </Modal>
    </section>
  );
}
